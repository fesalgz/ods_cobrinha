const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Inicia o servidor Node.js/Express em segundo plano
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  mainWindow.maximize();

  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 1000);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

autoUpdater.on("checking-for-update", () => {
  console.log("Procurando atualização...");
});

autoUpdater.on("update-available", () => {
  console.log("Atualização disponível!");
});

autoUpdater.on("update-not-available", () => {
  console.log("Sem atualização.");
});

autoUpdater.on("error", (err) => {
  console.log("Erro no updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  console.log("Baixando:", progressObj.percent);
});

autoUpdater.on("update-downloaded", async () => {
  console.log("Atualização baixada!");

  const resposta = await dialog.showMessageBox({
    type: "info",
    buttons: ["Reiniciar agora", "Depois"],
    title: "Atualização pronta",
    message: "A atualização foi baixada com sucesso.",
    detail: "Deseja reiniciar o aplicativo agora?"
  });

  if (resposta.response === 0) {
    autoUpdater.quitAndInstall();
  }
});

app.whenReady().then(() => {
  createWindow();

  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('browser-window-created', (event, win) => {
  win.maximize();
  win.setMenuBarVisibility(false);
});
