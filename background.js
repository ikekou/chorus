import { PROVIDERS } from "./src/providers.js";
import { injectPrompt } from "./src/injector.js";
import { flashTag } from "./src/highlight.js";

// 開いている「セット」を記録するキー。
// セット = 一緒に開いた窓のまとまり(provider 毎に1タブ)で、会話スレッドを共有する単位。
// chrome.storage.session はブラウザを閉じると消えるので、1セッション限りの管理にちょうどよい。
//
// 形: [{ id, label, createdAt, tabs: { chatgpt: tabId, ... } }]
const SETS_KEY = "mlc_sets";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "MLC_SEND") {
        const setId = await dispatch(
          message.prompt,
          message.providers,
          message.target
        );
        sendResponse({ ok: true, setId });
      } else if (message?.type === "MLC_GET_SETS") {
        sendResponse({ sets: await listSets() });
      } else if (message?.type === "MLC_FLASH_SET") {
        await flashSet(message.setId, message.label, message.color);
        sendResponse({ ok: true });
      } else if (message?.type === "MLC_RAISE_SET") {
        await raiseSet(message.setId);
        sendResponse({ ok: true });
      }
    } catch (err) {
      console.warn("[MultiLLMChat] 処理に失敗しました", err);
      sendResponse({ ok: false });
    }
  })();
  return true; // 非同期で sendResponse するため
});

// タブが閉じられたら記録から外す(空になったセットは破棄)。
chrome.tabs.onRemoved.addListener((tabId) => {
  forgetTab(tabId).catch(() => {});
});

// プロンプトを送信先(新規セット or 既存セット)へ送る。返り値は対象セットの id。
async function dispatch(prompt, providerIds, target) {
  const providers = providerIds.map((id) => PROVIDERS[id]).filter(Boolean);
  if (providers.length === 0) return null;

  const sets = await getSets();

  // 送信先セットを決める(既存が見つからなければ新規作成)。
  let set =
    target && target !== "new" ? sets.find((s) => s.id === target) : null;
  if (!set) {
    set = { id: makeId(), label: makeLabel(prompt), createdAt: Date.now(), tabs: {} };
    sets.push(set);
  }

  // セット内の生存タブ(再利用)と、新規に開く必要があるものに振り分ける。
  const reuse = [];
  const fresh = [];
  for (const provider of providers) {
    const tabId = set.tabs[provider.id];
    if (tabId != null && (await isTabAlive(tabId))) {
      reuse.push({ provider, tabId });
    } else {
      fresh.push(provider);
    }
  }

  // 生存タブには即・追記送信。
  for (const { provider, tabId } of reuse) {
    injectInto(tabId, provider, prompt);
  }

  // 新規分はウィンドウを並べて開き、セットに登録する。
  if (fresh.length > 0) {
    const area = await getWorkArea();
    const width = Math.floor(area.width / fresh.length);
    await Promise.all(
      fresh.map(async (provider, index) => {
        const tabId = await openWindow(provider, {
          left: area.left + index * width,
          top: area.top,
          width,
          height: area.height,
        });
        if (tabId != null) {
          set.tabs[provider.id] = tabId;
          waitForLoadThenInject(tabId, provider, prompt);
        }
      })
    );
  }

  await saveSets(sets);
  return set.id;
}

// プライマリディスプレイの作業領域(タスクバー等を除いた範囲)を取得する。
async function getWorkArea() {
  const fallback = { left: 0, top: 0, width: 1440, height: 900 };
  try {
    const displays = await chrome.system.display.getInfo();
    const primary = displays.find((d) => d.isPrimary) ?? displays[0];
    return primary?.workArea ?? fallback;
  } catch {
    return fallback;
  }
}

async function openWindow(provider, bounds) {
  const win = await chrome.windows.create({
    url: provider.url,
    type: "normal",
    focused: true,
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  });
  return win.tabs?.[0]?.id ?? null;
}

// タブの読み込み完了を待ち、SPA の描画を見越して少し遅らせて注入する。
function waitForLoadThenInject(tabId, provider, prompt) {
  const listener = (updatedTabId, info) => {
    if (updatedTabId !== tabId || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(listener);
    setTimeout(() => injectInto(tabId, provider, prompt), 1200);
  };
  chrome.tabs.onUpdated.addListener(listener);
}

// 指定タブにプロンプトを注入する(初回・追記の共通処理)。
function injectInto(tabId, provider, prompt) {
  chrome.scripting
    .executeScript({
      target: { tabId },
      func: injectPrompt,
      args: [provider, prompt],
    })
    .catch((err) =>
      console.warn(`[MultiLLMChat] ${provider.name} への注入に失敗`, err)
    );
}

// セットの各ページに一瞬ラベル帯を出して「どの窓か」を見分けさせる(フォーカスは奪わない)。
async function flashSet(setId, label, color) {
  const sets = await getSets();
  const set = sets.find((s) => s.id === setId);
  if (!set) return;
  for (const tabId of Object.values(set.tabs)) {
    if (!(await isTabAlive(tabId))) continue;
    chrome.scripting
      .executeScript({ target: { tabId }, func: flashTag, args: [label, color] })
      .catch(() => {});
  }
}

// セットの窓をまとめて前面に出す(後からそのセットの会話をまとめて見たいとき用)。
// 窓のフォーカスを奪うのでポップアップは閉じるが、それが目的の操作。
async function raiseSet(setId) {
  const sets = await getSets();
  const set = sets.find((s) => s.id === setId);
  if (!set) return;
  for (const tabId of Object.values(set.tabs)) {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    } catch {
      // 閉じられた窓はスキップ。
    }
  }
}

// --- セット記録のヘルパ ------------------------------------------------

async function getSets() {
  const stored = await chrome.storage.session.get(SETS_KEY);
  return stored[SETS_KEY] ?? [];
}

async function saveSets(sets) {
  await chrome.storage.session.set({ [SETS_KEY]: sets });
}

// 死んだタブ・空セットを掃除して、ポップアップ向けの一覧を返す。
async function listSets() {
  const sets = await getSets();
  let changed = false;
  for (const set of sets) {
    for (const [providerId, tabId] of Object.entries(set.tabs)) {
      if (!(await isTabAlive(tabId))) {
        delete set.tabs[providerId];
        changed = true;
      }
    }
  }
  const alive = sets.filter((s) => Object.keys(s.tabs).length > 0);
  if (alive.length !== sets.length) changed = true;
  if (changed) await saveSets(alive);

  return alive
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((s) => ({ id: s.id, label: s.label, providers: Object.keys(s.tabs) }));
}

async function forgetTab(closedTabId) {
  const sets = await getSets();
  let changed = false;
  for (const set of sets) {
    for (const [providerId, tabId] of Object.entries(set.tabs)) {
      if (tabId === closedTabId) {
        delete set.tabs[providerId];
        changed = true;
      }
    }
  }
  if (!changed) return;
  await saveSets(sets.filter((s) => Object.keys(s.tabs).length > 0));
}

async function isTabAlive(tabId) {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeLabel(prompt) {
  const text = prompt.replace(/\s+/g, " ").trim();
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}
