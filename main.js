const { app, BrowserWindow } = require('electron');
const path = require('path');

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
    autoHideMenuBar: true // Oculta o menu padrão superior
  });

  // Aguarda meio segundo para garantir que o servidor Express iniciou na porta 3000
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000/');
  }, 500);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
