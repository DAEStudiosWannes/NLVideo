// main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");
const todesktop = require("@todesktop/runtime");

todesktop.init();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Enables loading Vue components in renderer
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // optional, recommended for security
    },
  });

  // Load the Vue app's HTML file
  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
