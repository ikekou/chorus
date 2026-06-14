**English** | [日本語](README.ja.md)

# Chorus (Chrome extension)

> Ask many AIs at once, and let them answer in chorus.

Chorus is a Manifest V3 Chrome extension. Write a prompt in a single input box, hit send, and it opens **ChatGPT / Claude / Gemini** in tiled windows and auto-sends the same prompt to each.

It reuses your existing logged-in sessions (e.g. a ChatGPT Plus subscription), so **no API key and no usage-based billing** are required.

## What's new and useful here

Similar tools already exist, in two flavors: ones that **wrap the services in a custom UI**, and ones that **auto-type into tabs**. Chorus differs:

- **It places the real pages side by side (no custom-UI wrapper).** So every **native feature stays usable** — model selectors, GPTs, Gemini model switching, the web-search toggle, Canvas / Artifacts, and so on. Things a custom UI can't offer keep working.
- **Tiled as independent OS windows.** Not iframes or a side panel — real windows split evenly across the screen (iframes are impossible here because each service blocks embedding).
- **Run multiple "sets" at once.** Keep "3 windows for research A" and "3 windows for coding B" in parallel, and route each prompt with a target selector. Tell sets apart with **colored labels**, **bring a whole set to the front** in one click, and **close a set or all sets** at once.
- **Follow-ups.** Keep sending the same prompt to the already-open chats (reliably typed even in background windows).
- **Uses your existing logins.** No API key, no extra payment.
- **Collects and transmits no data.** Everything happens in your browser ([PRIVACY.md](PRIVACY.md)).

In one line: Chorus **doesn't trap you in a custom UI — it lines up the real chats and unifies just the driving.**

## How it works for you

- Open the popup from the toolbar icon and type your prompt once
- Pick the target models with checkboxes (multiple allowed)
- On send, the selected models open as tiled windows and the prompt is auto-filled and submitted to each
- **Follow-ups:** sending again from the same popup reuses the open chats and appends to all of them (no new windows). Only a model whose window you closed is reopened next time

### Sets (running several conversations at once)

A **set** is a group of windows opened together (one per model) that share a conversation thread.
Choose where to send with **Target** at the top of the popup.

- **🆕 Open a new set** — start fresh: the selected models open as a new set of tiled windows
- **An existing set (colored label)** — append to that set's open windows (only closed ones are reopened)

Because multiple sets can be open at once, you can run "3 windows for research A" and "3 windows for coding B" in parallel.
To see which windows belong to which set, selecting an existing set briefly flashes a **colored label banner** on each of its pages (it doesn't steal focus, so the popup stays open).
A set's label is auto-generated from the beginning of the first prompt that opened it.

The **⤴ Front** button on a set row brings that set's windows to the front together, so you don't have to raise each window by hand when you want to review a set later (this moves focus to the windows, so the popup closes).

The **✕** button closes that set's windows together. **Close all sets** at the bottom closes every set at once. Only the windows the set opened are closed (tabs you later opened in the same window are left alone).

## Architecture

| File | Role |
|---|---|
| `manifest.json` | Permissions and configuration (MV3) |
| `popup.html` / `popup.js` | Prompt input box and target-selection UI |
| `background.js` | Window creation, and script injection after load completes |
| `src/injector.js` | Fills the prompt into each site's input and submits |
| `src/highlight.js` | Briefly shows a label banner to tell sets apart |
| `src/providers.js` | URL and DOM selectors for each model |

Flow: send from the popup → `background.js` opens the windows → it waits for the page to finish loading → `chrome.scripting.executeScript` injects the `injector`, which fills the input and submits.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Use it from the icon that appears in the toolbar

> Icons are bundled in `icons/` (`icon-16/32/48/128.png`): a rounded plate whose outer corners
> are transparent, so it renders cleanly in the toolbar, the extensions page, and the store.
> Generate them with `python3 scripts/render-icons.py` (requires Pillow); edit the shapes/colors
> in that script and re-run to regenerate.

## Notes / known limitations

- **DOM selectors break when a service updates its UI.** If it stops working, fix the selectors in `src/providers.js`.
- Each input box is a contenteditable (rich editor), so assigning `value` isn't recognized. Chorus inserts text via a **synthetic paste event** (`execCommand('insertText')` and direct assignment are fallbacks) so it works reliably even in background windows.
- It auto-submits. To only draft without sending, set `autoSend` to `false` in `src/providers.js`.

## Supported services

- ChatGPT (`chatgpt.com`)
- Claude (`claude.ai`)
- Gemini (`gemini.google.com`)

## Build

Build the distributable zip:

```bash
./scripts/package.sh   # produces dist/chorus-<version>.zip
```

- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Privacy policy: [PRIVACY.md](PRIVACY.md)
- License: [MIT](LICENSE)
