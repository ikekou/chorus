# プライバシーポリシー / Privacy Policy — Chorus

最終更新: 2026-06-14

## 日本語

Chorus(以下「本拡張」)は、ユーザーのプライバシーを最優先に設計されています。

### 収集・送信するデータ

**本拡張は、いかなる個人データも収集・外部送信しません。** 解析ツールやトラッキング、外部サーバーへの通信は一切ありません。開発者を含む第三者がユーザーのデータを受け取ることはありません。

### ローカルに保存する情報

次の情報のみ、ブラウザ内のローカルストレージ(`chrome.storage`)に保存します。いずれも端末内に留まり、外部へ送信されません。

- 入力途中のプロンプトの下書き、および選択した送信先モデル(次回復元のため / `chrome.storage.local`)
- 現在開いている会話セットのウィンドウ・タブの識別子(追記送信先の管理のため / `chrome.storage.session`、ブラウザを閉じると消去)

### ページ上で行う処理

本拡張は、ユーザーが入力したプロンプトを、ユーザー自身が選んだ AI チャットサービス(ChatGPT / Claude / Gemini)の入力欄に差し込み、送信ボタンを押します。これらの処理はすべてユーザーのブラウザ内で完結し、本拡張の運営者のサーバーを経由しません。各 AI サービスへのログインや送信内容の取り扱いは、それぞれのサービスのプライバシーポリシーに従います。

### 権限の利用目的

- **対象サイトへのアクセス(host permissions: chatgpt.com / claude.ai / gemini.google.com)**: プロンプトの差し込みと送信のため
- **scripting**: 上記サイトのページ内に入力・送信処理を注入するため
- **storage**: 上記「ローカルに保存する情報」のため
- **system.display**: 開いたウィンドウを画面に並べて配置するための画面サイズ取得のため

### お問い合わせ

ご質問・不具合の報告は GitHub の Issues へお願いします:
https://github.com/ikekou/chorus/issues

---

## English

Chorus ("the Extension") is designed with user privacy as the top priority.

### Data we collect or transmit

**The Extension does not collect or transmit any personal data.** There is no analytics, tracking, or communication with any external server. No third party, including the developer, receives user data.

### Information stored locally

Only the following is stored in the browser's local storage (`chrome.storage`). It stays on your device and is never sent anywhere.

- Your draft prompt and selected target models, to restore them next time (`chrome.storage.local`)
- Identifiers of the windows/tabs of currently open conversation sets, to route follow-up messages (`chrome.storage.session`, cleared when the browser closes)

### What happens on the page

The Extension inserts your typed prompt into the input box of the AI chat services you choose (ChatGPT / Claude / Gemini) and clicks send. All of this happens within your browser and never passes through any server operated by the Extension. Your login and the content you send are governed by each AI service's own privacy policy.

### Why each permission is used

- **Host permissions (chatgpt.com / claude.ai / gemini.google.com)**: to insert and send prompts
- **scripting**: to inject the input/send logic into those pages
- **storage**: for the locally stored information described above
- **system.display**: to read the screen size so opened windows can be tiled side by side

### Contact

For questions or bug reports, please open a GitHub issue:
https://github.com/ikekou/chorus/issues
