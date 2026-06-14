// ページ内に一瞬だけラベル帯と枠を表示して「このセット」を見分けさせる。
//
// 重要: executeScript の `func` として文字列化されてページ側で実行されるため、
// 外部変数を参照しない自己完結関数にすること。引数は JSON シリアライズ可能な値のみ。
export function flashTag(label, color) {
  const TOAST_ID = "__mlc_flash_toast__";
  const BORDER_ID = "__mlc_flash_border__";
  document.getElementById(TOAST_ID)?.remove();
  document.getElementById(BORDER_ID)?.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = label;
  Object.assign(toast.style, {
    position: "fixed",
    top: "14px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    background: color,
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "999px",
    font: "600 14px -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: "0 6px 20px rgba(0,0,0,.35)",
    pointerEvents: "none",
    transition: "opacity .4s ease",
    opacity: "1",
  });

  const border = document.createElement("div");
  border.id = BORDER_ID;
  Object.assign(border.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    border: `4px solid ${color}`,
    boxSizing: "border-box",
    pointerEvents: "none",
    transition: "opacity .4s ease",
    opacity: "1",
  });

  document.documentElement.append(border, toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    border.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
      border.remove();
    }, 400);
  }, 1400);
}
