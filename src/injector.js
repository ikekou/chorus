// ページ内で実行される注入関数。
//
// 重要: この関数は chrome.scripting.executeScript の `func` として渡され、
// 文字列化されてページ側で実行される。そのためモジュールの外部変数を
// 参照してはならない(完全に自己完結している必要がある)。
// 引数の config / prompt は JSON シリアライズ可能な値のみ。
export function injectPrompt(config, prompt) {
  const FIND_DEADLINE = Date.now() + 20000; // 入力欄が現れるまで最大20秒待つ
  const tag = "[MultiLLMChat]";

  // セレクタ配列を上から試して最初に見つかった要素を返す。
  const pick = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  };

  const run = () => {
    const input = pick(config.inputSelectors);
    if (!input) {
      if (Date.now() < FIND_DEADLINE) {
        setTimeout(run, 300);
      } else {
        console.warn(tag, `${config.name}: 入力欄が見つかりませんでした`);
      }
      return;
    }

    fillInput(input);
    if (config.autoSend) {
      // リッチエディタの反映を待ってから送信を試みる。
      setTimeout(() => trySend(input), 400);
    }
  };

  // 入力欄にプロンプトを差し込む。
  // contenteditable は value 代入では React が認識しないため、
  // execCommand('insertText') で「ユーザー入力」として通知する。
  const fillInput = (input) => {
    input.focus();

    if (input.isContentEditable) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.addRange(range);
      // 既存内容を選択した状態で挿入 = 置き換え。
      document.execCommand("insertText", false, prompt);
    } else {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (setter) setter.call(input, prompt);
      else input.value = prompt;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  // 送信ボタンが押せる状態になるのを待ってクリック。
  // 見つからなければ最後に Enter キーで送信を試みる。
  const trySend = (input) => {
    const SEND_DEADLINE = Date.now() + 8000;

    const attempt = () => {
      const button = pick(config.sendSelectors);
      const enabled =
        button &&
        !button.disabled &&
        button.getAttribute("aria-disabled") !== "true";

      if (enabled) {
        button.click();
        return;
      }
      if (Date.now() < SEND_DEADLINE) {
        setTimeout(attempt, 200);
        return;
      }
      // フォールバック: Enter キー送信。
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          bubbles: true,
        })
      );
    };

    attempt();
  };

  run();
}
