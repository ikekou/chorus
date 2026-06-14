import { PROVIDERS } from "./src/providers.js";
import { injectPrompt } from "./src/injector.js";

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

// 選択された LLM のウィンドウを画面に並べて開き、各ページに注入する。
async function dispatch(prompt, providerIds) {
  const targets = providerIds
    .map((id) => PROVIDERS[id])
    .filter(Boolean);
  if (targets.length === 0) return;

  const area = await getWorkArea();
  const width = Math.floor(area.width / targets.length);

  await Promise.all(
    targets.map((provider, index) =>
      openAndInject(provider, prompt, {
        left: area.left + index * width,
        top: area.top,
        width,
        height: area.height,
      })
    )
  );
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

// ウィンドウを開き、読み込み完了を待ってプロンプトを注入する。
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
  waitForLoadThenInject(tabId, provider, prompt);
}

// タブの読み込み完了を待ち、SPA の描画を見越して少し遅らせて注入する。
function waitForLoadThenInject(tabId, provider, prompt) {
  const listener = (updatedTabId, info) => {
    if (updatedTabId !== tabId || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(listener);

    setTimeout(() => {
      chrome.scripting
        .executeScript({
          target: { tabId },
          func: injectPrompt,
          args: [provider, prompt],
        })
        .catch((err) =>
          console.warn(`[MultiLLMChat] ${provider.name} への注入に失敗`, err)
        );
    }, 1200);
  };

  chrome.tabs.onUpdated.addListener(listener);
}
