// 各 LLM サービスの定義。
//
// inputSelectors / sendSelectors は上から順に試して、最初に見つかった要素を使う
// フォールバック方式。各社の UI 更新で壊れたら、ここのセレクタを直すのが基本。
//
// autoSend: false にすると、入力欄に差し込むだけで送信ボタンは押さない(下書き状態)。
export const PROVIDERS = {
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    inputSelectors: [
      "#prompt-textarea",
      'div.ProseMirror[contenteditable="true"]',
      'textarea[data-id]',
    ],
    sendSelectors: [
      '[data-testid="send-button"]',
      'button[aria-label="プロンプトを送信する"]',
      'button[aria-label="Send prompt"]',
    ],
    autoSend: true,
  },

  claude: {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai/new",
    inputSelectors: [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]',
    ],
    sendSelectors: [
      'button[aria-label="Send message"]',
      'button[aria-label="メッセージを送信"]',
      'button[type="submit"]',
    ],
    autoSend: true,
  },

  gemini: {
    id: "gemini",
    name: "Gemini",
    url: "https://gemini.google.com/app",
    inputSelectors: [
      "rich-textarea div.ql-editor",
      'div.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"]',
    ],
    sendSelectors: [
      'button[aria-label="Send message"]',
      'button[aria-label="送信"]',
      "button.send-button",
    ],
    autoSend: true,
  },
};

// 表示・反復処理用の配列。
export const PROVIDER_LIST = Object.values(PROVIDERS);
