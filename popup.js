import { PROVIDER_LIST, PROVIDERS } from "./src/providers.js";

const STORAGE_KEY = "mlc_state";

// セットごとに割り当てる色(見分け用)。一覧の並び順で循環して使う。
const SET_COLORS = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

const promptEl = document.getElementById("prompt");
const targetsEl = document.getElementById("targets");
const providersEl = document.getElementById("providers");
const sendEl = document.getElementById("send");

// 現在開いているセット一覧(背景から取得)。
let sets = [];

// --- 送信するモデルのチェックボックス ---------------------------------

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

// --- 送信先(新規セット / 既存セット)のラジオ -------------------------

function colorFor(index) {
  return SET_COLORS[index % SET_COLORS.length];
}

// セットのラベル表示。番号と、稼働中モデルの内訳を添える。
function displayLabel(set, index) {
  const names = set.providers.map((id) => PROVIDERS[id]?.name ?? id).join("・");
  return { number: `${index + 1}`, text: set.label || "(無題)", meta: names };
}

function renderTargets(selectedTarget) {
  targetsEl.innerHTML = "";

  // 先頭は常に「新しいセット」。
  targetsEl.appendChild(
    targetRow({ value: "new", dot: "transparent", icon: "🆕", text: "新しいセットを開く" })
  );

  sets.forEach((set, index) => {
    const { number, text, meta } = displayLabel(set, index);
    targetsEl.appendChild(
      targetRow({
        value: set.id,
        setId: set.id,
        dot: colorFor(index),
        text: `${number}. ${text}`,
        meta,
      })
    );
  });

  // セットが1つ以上あるときだけ「全部閉じる」ボタンを出す。
  if (sets.length > 0) {
    const closeAllEl = document.createElement("button");
    closeAllEl.type = "button";
    closeAllEl.className = "close-all";
    closeAllEl.textContent = "すべてのセットを閉じる";
    closeAllEl.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "MLC_CLOSE_ALL" });
      await refreshSets("new");
    });
    targetsEl.appendChild(closeAllEl);
  }

  // 選択を復元(対象が消えていたら新規へ)。
  const exists = selectedTarget === "new" || sets.some((s) => s.id === selectedTarget);
  const value = exists ? selectedTarget : sets.length ? sets[sets.length - 1].id : "new";
  const input = targetsEl.querySelector(`input[value="${CSS.escape(value)}"]`);
  if (input) input.checked = true;
}

function targetRow({ value, dot, icon, text, meta, setId }) {
  const label = document.createElement("label");
  label.className = "target";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "target";
  input.value = value;
  input.addEventListener("change", onTargetChange);

  const dotEl = document.createElement("span");
  dotEl.className = "dot";
  dotEl.style.background = dot;
  if (icon) dotEl.textContent = "";

  const textEl = document.createElement("span");
  textEl.className = "label";
  textEl.textContent = icon ? `${icon} ${text}` : text;

  label.append(input, dotEl, textEl);
  if (meta) {
    const metaEl = document.createElement("span");
    metaEl.className = "meta";
    metaEl.textContent = meta;
    label.appendChild(metaEl);
  }

  // 既存セットには「前面に出す」「閉じる」ボタンを付ける。
  if (setId) {
    const raiseEl = document.createElement("button");
    raiseEl.type = "button";
    raiseEl.className = "btn";
    raiseEl.textContent = "⤴ 前面";
    raiseEl.title = "このセットの窓をまとめて前面に出す";
    raiseEl.addEventListener("click", (e) => {
      // ラジオの選択ではなく前面化だけ行う。
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: "MLC_RAISE_SET", setId });
      window.close();
    });

    const closeEl = document.createElement("button");
    closeEl.type = "button";
    closeEl.className = "btn close";
    closeEl.textContent = "✕";
    closeEl.title = "このセットの窓をまとめて閉じる";
    closeEl.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await chrome.runtime.sendMessage({ type: "MLC_CLOSE_SET", setId });
      await refreshSets("new");
    });

    label.append(raiseEl, closeEl);
  }
  return label;
}

function selectedTarget() {
  return targetsEl.querySelector('input[name="target"]:checked')?.value ?? "new";
}

// 既存セットを選んだら、その窓にラベル帯をフラッシュして見分けられるようにする。
function onTargetChange() {
  const value = selectedTarget();
  if (value === "new") return;
  const index = sets.findIndex((s) => s.id === value);
  if (index < 0) return;
  const { number, text } = displayLabel(sets[index], index);
  chrome.runtime.sendMessage({
    type: "MLC_FLASH_SET",
    setId: value,
    label: `${number}. ${text}`,
    color: colorFor(index),
  });
}

// --- 状態の保存・復元 --------------------------------------------------

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
  renderProviders(state.providers ?? PROVIDER_LIST.map((p) => p.id));
}

async function refreshSets(selectTarget) {
  const res = await chrome.runtime.sendMessage({ type: "MLC_GET_SETS" });
  sets = res?.sets ?? [];
  // 指定が無ければ直近セット(あれば)を既定にして会話継続を1クリックに。
  const fallback = sets.length ? sets[sets.length - 1].id : "new";
  renderTargets(selectTarget ?? fallback);
}

// --- 送信 --------------------------------------------------------------

async function send() {
  const prompt = promptEl.value.trim();
  const providers = selectedProviderIds();
  if (!prompt || providers.length === 0) return;

  sendEl.disabled = true;
  const res = await chrome.runtime.sendMessage({
    type: "MLC_SEND",
    prompt,
    providers,
    target: selectedTarget(),
  });

  // 送信したセットを選択状態にして、続けて追記できるようにする。
  promptEl.value = "";
  saveState();
  await refreshSets(res?.setId);
  sendEl.disabled = false;
  promptEl.focus();
}

promptEl.addEventListener("input", saveState);
sendEl.addEventListener("click", send);
promptEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    send();
  }
});

loadState();
refreshSets();
