import { PROVIDERS } from "./src/providers.js";
import { injectPrompt } from "./src/injector.js";

// 開いた LLM タブを provider 単位で記録しておくキー。
// chrome.storage.session はブラウザを閉じると消える(= 1セッション限り)ので、
// 「今開いているチャットの追記送信先」の管理にちょうどよい。
const SESSION_KEY = "mlc_sessions";

// ポップアップからの送信指示を受け取る。
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "MLC_SEND") {
    dispatch(message.prompt, message.providers).catch((err) =>
      console.warn("[MultiLLMChat] 送信に失敗しました", err)
    );
    sendResponse({ ok: true });
  }
  return false;
});

// タブが閉じられたら記録から外す(次回は新規ウィンドウで開き直す)。
chrome.tabs.onRemoved.addListener((tabId) => {
  forgetTab(tabId).catch(() => {});
});

// 選択された LLM へプロンプトを送る。
// 既に開いているタブがあればそれに追記送信、無ければウィンドウを並べて開く。
async function dispatch(prompt, providerIds) {
  const targets = providerIds.map((id) => PROVIDERS[id]).filter(Boolean);
  if (targets.length === 0) return;

  const sessions = await getSessions();

  // 既存タブ(再利用)と新規オープンに振り分ける。
  const reuse = [];
  const fresh = [];
  for (const provider of targets) {
    const tabId = sessions[provider.id];
    if (tabId != null && (await isTabAlive(tabId))) {
      reuse.push({ provider, tabId });
    } else {
      fresh.push(provider);
    }
  }

  // 既存タブには即座に追記送信(読み込み待ち不要)。
  for (const { provider, tabId } of reuse) {
    injectInto(tabId, provider, prompt);
  }

  // 新規分はウィンドウを並べて開く。
  if (fresh.length > 0) {
    const area = await getWorkArea();
    const width = Math.floor(area.width / fresh.length);
    await Promise.all(
      fresh.map((provider, index) =>
        openAndInject(provider, prompt, {
          left: area.left + index * width,
          top: area.top,
          width,
          height: area.height,
        })
      )
    );
  }
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

// ウィンドウを開き、記録し、読み込み完了を待ってプロンプトを注入する。
async function openAndInject(provider, prompt, bounds) {
  const win = await chrome.windows.create({
    url: provider.url,
    type: "normal",
    focused: true,
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  });

  const tabId = win.tabs?.[0]?.id;
  if (tabId == null) return;

  await rememberTab(provider.id, tabId);
  waitForLoadThenInject(tabId, provider, prompt);
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

// 指定タブにプロンプトを注入する(追記送信・初回送信の共通処理)。
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

// --- セッション(開いているタブ)の記録 -------------------------------

async function getSessions() {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  return stored[SESSION_KEY] ?? {};
}

async function isTabAlive(tabId) {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

async function rememberTab(providerId, tabId) {
  const sessions = await getSessions();
  sessions[providerId] = tabId;
  await chrome.storage.session.set({ [SESSION_KEY]: sessions });
}

async function forgetTab(tabId) {
  const sessions = await getSessions();
  let changed = false;
  for (const [providerId, id] of Object.entries(sessions)) {
    if (id === tabId) {
      delete sessions[providerId];
      changed = true;
    }
  }
  if (changed) await chrome.storage.session.set({ [SESSION_KEY]: sessions });
}
