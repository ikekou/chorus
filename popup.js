import { PROVIDER_LIST } from "./src/providers.js";

const STORAGE_KEY = "mlc_state";

const promptEl = document.getElementById("prompt");
const providersEl = document.getElementById("providers");
const sendEl = document.getElementById("send");

// 送信先のチェックボックスを描画する。
function renderProviders(selected) {
  providersEl.innerHTML = "";
  for (const provider of PROVIDER_LIST) {
    const label = document.createElement("label");
    label.className = "provider";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = provider.id;
    input.checked = selected.includes(provider.id);
    input.addEventListener("change", saveState);

    label.append(input, document.createTextNode(provider.name));
    providersEl.appendChild(label);
  }
}

function selectedProviderIds() {
  return [...providersEl.querySelectorAll("input:checked")].map((el) => el.value);
}

// 入力内容と送信先の選択を次回のために保存する。
function saveState() {
  chrome.storage.local.set({
    [STORAGE_KEY]: {
      prompt: promptEl.value,
      providers: selectedProviderIds(),
    },
  });
}

async function loadState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] ?? {};
  promptEl.value = state.prompt ?? "";
  const selected = state.providers ?? PROVIDER_LIST.map((p) => p.id);
  renderProviders(selected);
}

async function send() {
  const prompt = promptEl.value.trim();
  const providers = selectedProviderIds();
  if (!prompt || providers.length === 0) return;

  sendEl.disabled = true;
  await chrome.runtime.sendMessage({ type: "MLC_SEND", prompt, providers });
  window.close();
}

promptEl.addEventListener("input", saveState);
sendEl.addEventListener("click", send);

// ⌘/Ctrl + Enter で送信。
promptEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

loadState();
