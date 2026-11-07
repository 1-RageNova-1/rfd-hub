# RFD Hub — client (Electron)

```bash
cd client
npm install
npm start
```

Set API URL in the login screen (default `http://127.0.0.1:3080`).

Set path to `RFD.exe` in settings (gear) so Join can launch the player.

On Windows, Join runs roughly:

```
RFD.exe player -h HOST -p WEB_PORT -rp RCC_PORT -u USERNAME
```
