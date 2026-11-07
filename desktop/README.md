# RFD Hub — Windows desktop app

Native window (WebView2), not a browser tab. Uses the same `client/ui` as the web UI.

## Run

```bat
cd path\to\rfd-hub
pip install -r desktop\requirements.txt
python desktop\rfd_hub_app.py
```

1. Log in with username + API `http://185.45.149.198:50201`
2. Settings → set full path to `RFD.exe` (example `D:\rfd\RFD.exe`)
3. Home → Join → launches RFD player

## Build .exe (optional)

```bat
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed --name RFDHub desktop\rfd_hub_app.py
```

Copy `client\ui` next to the built exe, or keep running from the repo so `client/ui` resolves.
