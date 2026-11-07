"""
RFD Hub — real Windows desktop window (not a browser tab).
Uses pywebview + your existing client/ui.

Install once:
  pip install pywebview

Run from repo root:
  python desktop/rfd_hub_app.py

Optional single-file exe later:
  pip install pyinstaller
  pyinstaller --noconfirm --onefile --windowed --name RFDHub desktop/rfd_hub_app.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

try:
    import webview
except ImportError:
    print("Missing pywebview. Run:  pip install pywebview")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
UI_DIR = ROOT / "client" / "ui"
CFG_DIR = Path(os.environ.get("APPDATA", Path.home())) / "rfd-hub"
CFG_PATH = CFG_DIR / "config.json"

DEFAULT_API = "http://185.45.149.198:50201"


def _load_cfg() -> dict:
    try:
        return json.loads(CFG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"apiBase": DEFAULT_API, "rfdPath": ""}


def _save_cfg(data: dict) -> dict:
    CFG_DIR.mkdir(parents=True, exist_ok=True)
    CFG_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


class Api:
    """Exposed to JS as window.pywebview.api"""

    def get_config(self):
        return _load_cfg()

    # aliases so either naming style works from JS
    def getConfig(self):
        return self.get_config()

    def set_config(self, partial=None):
        cfg = _load_cfg()
        if isinstance(partial, dict):
            cfg.update(partial)
        return _save_cfg(cfg)

    def setConfig(self, partial=None):
        return self.set_config(partial)

    def launch_rfd(self, payload=None):
        if not isinstance(payload, dict):
            return {"ok": False, "error": "bad payload"}
        host = payload.get("host")
        web_port = payload.get("webPort")
        rcc_port = payload.get("rccPort")
        username = payload.get("username")
        cfg = _load_cfg()
        exe = (cfg.get("rfdPath") or "").strip()
        if not exe or not Path(exe).is_file():
            return {
                "ok": False,
                "error": "RFD.exe path not set or missing. Open Settings and set the full path.",
            }
        args = [
            exe,
            "player",
            "-h",
            str(host),
            "-p",
            str(web_port),
            "-rp",
            str(rcc_port),
            "-u",
            str(username),
        ]
        try:
            subprocess.Popen(args, cwd=str(Path(exe).parent))
            return {"ok": True, "cmd": " ".join(args)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def launchRfd(self, payload=None):
        return self.launch_rfd(payload)


def main() -> None:
    index = UI_DIR / "index.html"
    if not index.is_file():
        print(f"Missing UI at {index}")
        print("Run this from a full clone of rfd-hub (needs client/ui).")
        sys.exit(1)

    api = Api()
    webview.create_window(
        title="RFD Hub",
        url=index.as_uri(),
        js_api=api,
        width=1180,
        height=760,
        min_size=(900, 600),
        background_color="#191919",
    )
    # Edge Chromium backend on modern Windows
    webview.start(debug=False)


if __name__ == "__main__":
    main()
