// ページ内で実行される注入関数。
//
// 重要: この関数は chrome.scripting.executeScript の `func` として渡され、
// 文字列化されてページ側で実行される。そのためモジュールの外部変数を
// 参照してはならない(完全に自己完結している必要がある)。
// 引数の config / prompt は JSON シリアライズ可能な値のみ。
export function injectPrompt(config, prompt) {
  const FIND_DEADLINE = Date.now() + 20000; // 入力欄が現れるまで最大20秒待つ
  const tag = "[Chorus]";

  // セレクタ配列を上から試して最初に見つかった要素を返す。
  const pick = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  };

  const hasText = (el) => (el.textContent || "").trim().length > 0;

  // contenteditable の中身を全選択する(挿入で置き換えるため)。
  const selectAll = (el) => {
    const selection = window.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.addRange(range);
  };

  // 合成 paste イベントでテキストを挿入する。
  // execCommand('insertText') は document がフォーカスを持たないと無視されるため、
  // 追記送信(対象が背面の窓)では使えない。paste イベントは clipboardData を
  // イベントに直接載せるので、背面タブでもエディタ側が受け取って挿入できる。
  const dispatchPaste = (el, text) => {
    try {
      const data = new DataTransfer();
      data.setData("text/plain", text);
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        })
      );
      return true;
    } catch {
      return false;
    }
  };

  // contenteditable(ProseMirror / Quill 等)にプロンプトを差し込む。
  const fillContentEditable = (el) => {
    el.focus();
    selectAll(el);
    dispatchPaste(el, prompt);

    // 反映を確認し、入っていなければ execCommand → 直接代入の順でフォールバック。
    setTimeout(() => {
      if (hasText(el)) return;
      el.focus();
      selectAll(el);
      if (document.execCommand("insertText", false, prompt) && hasText(el)) return;
      el.textContent = prompt;
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: prompt,
        })
      );
    }, 120);
  };

  // 通常の textarea にプロンプトを差し込む。
  const fillTextarea = (el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    if (setter) setter.call(el, prompt);
    else el.value = prompt;
    el.dispatchEvent(new Event("input", { bubbles: true }));
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

    if (input.isContentEditable) fillContentEditable(input);
    else fillTextarea(input);

    if (config.autoSend) {
      // 挿入の反映を待ってから送信を試みる。
      setTimeout(() => trySend(input), 500);
    }
  };

  run();
}
