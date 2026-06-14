# Multi LLM Chat (Chrome 拡張)

1 つの入力欄からプロンプトを書いて確定すると、**ChatGPT / Claude / Gemini** のウィンドウを並べて開き、それぞれに同じプロンプトを自動送信する Chrome 拡張機能(Manifest V3)です。

既存のログイン済みセッション(ChatGPT Plus などのサブスク)をそのまま使えるのが特徴で、API キーや従量課金は不要です。

## できること

- ツールバーのアイコンからポップアップを開き、プロンプトを 1 回入力
- 送信したい LLM をチェックボックスで選択(複数可)
- 確定すると、選んだ LLM のウィンドウが画面に並んで開き、各サービスにプロンプトを自動入力 → 送信

## 仕組み

| ファイル | 役割 |
|---|---|
| `manifest.json` | 権限・構成の宣言(MV3) |
| `popup.html` / `popup.js` | プロンプト入力欄と送信先の選択 UI |
| `background.js` | ウィンドウ生成と、読み込み完了を待ってのスクリプト注入 |
| `src/injector.js` | 各サイトの入力欄にプロンプトを差し込み、送信する処理 |
| `src/providers.js` | 各 LLM の URL や DOM セレクタの定義 |

ポップアップで送信 → `background.js` がウィンドウを開く → ページの読み込み完了を待つ → `chrome.scripting.executeScript` で `injector` を注入し、入力欄へ差し込み & 送信、という流れです。

## インストール(開発者モードで読み込み)

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」で、このフォルダを選択
4. ツールバーに表示されるアイコンをクリックして利用

> アイコン画像は同梱していません(MV3 はアイコン無しでも動作します)。必要なら `manifest.json` に `action.default_icon` を追加してください。

## 注意点 / 既知の弱点

- **DOM セレクタは各社の UI 更新で壊れます。** 動かなくなったら `src/providers.js` のセレクタを修正してください。
- 入力欄は各社とも contenteditable(リッチエディタ)のため、`value` 代入では認識されません。本拡張では `execCommand('insertText')` を使って React 側に変更を通知しています。
- 自動送信まで行います。送信せず下書きだけにしたい場合は `src/providers.js` の `autoSend` を `false` にしてください。

## 対応サービス

- ChatGPT (`chatgpt.com`)
- Claude (`claude.ai`)
- Gemini (`gemini.google.com`)
