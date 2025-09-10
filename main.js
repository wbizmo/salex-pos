const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isOnline = require('is-online');
const packageJson = require('./package.json');

let mainWindow;
let splash;
let offlineOverlay;
const url = 'https://salepro.globevest.site';

async function createWindows() {
  // Splash screen
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: '#f4f6fa',
    show: true,
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));

  // Main app window (hidden until ready)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, 'build/icon.ico'),
    title: `Sales+ POS v${packageJson.version}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:main', // persist sessions/cookies
    },
  });
  mainWindow.setMenuBarVisibility(false);

  // Pre-create offline overlay (hidden by default)
  offlineOverlay = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    frame: false,
    fullscreen: true,
    backgroundColor: '#fff',
    webPreferences: {
      nodeIntegration: true,
    },
  });
  offlineOverlay.loadFile(path.join(__dirname, 'offline.html'));

  // First check internet before loading main URL
  if (await isOnline()) {
    mainWindow.loadURL(url);
  } else {
    offlineOverlay.show();
  }

  // When web app finishes loading, hide splash, show main
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splash) splash.close();
      mainWindow.show();
    }, 1500);
  });

  // Always keep title fixed
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle(`Sales+ POS v${packageJson.version}`);
  });

  // Hybrid monitoring
  // Event-based detection
  mainWindow.webContents.executeJavaScript(`
    const { ipcRenderer } = require('electron');
    window.addEventListener('offline', () => ipcRenderer.send('offline'));
    window.addEventListener('online', () => ipcRenderer.send('online'));
  `);

  // Backup check every 5s
  setInterval(async () => {
    if (!(await isOnline())) {
      ipcMain.emit('offline');
    } else {
      ipcMain.emit('online');
    }
  }, 5000);

  // IPC handling (just show/hide overlay, don’t reload main window)
  ipcMain.on('offline', () => {
    if (!offlineOverlay.isVisible()) offlineOverlay.show();
  });
  ipcMain.on('online', () => {
    if (offlineOverlay.isVisible()) offlineOverlay.hide();
  });
}

app.whenReady().then(createWindows);
