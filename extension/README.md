# Download Metadata Logger

This lightweight Chrome/Edge extension intercepts browser download events via the `chrome.downloads` API plus the `chrome.webRequest` API so you can capture headers, cookies, referer, and user-agent along with the downloads metadata. All captured data is stored in `chrome.storage.local`, which makes it easy to observe how the real browser interacts with your download manager.

## Installation

1. Build the extension sources: no build step is required; the files under `extension/` are ready to load.
1. Open `chrome://extensions` (or `edge://extensions`) in the browser that will be used for testing.
1. Enable **Developer mode** (top-right toggle).
1. Click **Load unpacked** and select the `extension/` folder in this repository.
1. The extension will appear in the toolbar; click the icon to open the popup and watch download logs accumulate.

## What It Logs

Every time a download is created or changes state, the background service worker:

- captures the metadata (`id`, `filename`, `url`, `totalBytes`, `bytesReceived`, `state`, `startTime`, `endTime`),  
- captures the outgoing request headers (referer, user-agent, cookies, and the first few header lines) via `chrome.webRequest`,  
- tags the entry with the stage that triggered the capture (`created` vs. `changed`),  
- persists the newest 250 entries into `chrome.storage.local`, and  
- prints the log object to the background console for deeper inspection.

## Using the Popup

The popup lists the most recent log entries with their timestamp, stage, filename/URL, byte counters, and request headers/cookies. Use **Refresh** to pull the latest data without closing the popup, **Copy logs** to copy a textual summary of every entry to the clipboard for sharing/debugging, and **Clear logs** to reset the storage when you want to start a new session.

## Supporting Investigation

To study any particular download event in depth:

1. Open the browser's **Extensions** page.
1. Route to the extension's **Service worker (background page)** via the "Inspect views" link.
1. Watch the console for each `Download log stored` message to see how the site interacts with the downloads API and compare it with what your download manager is sending.
