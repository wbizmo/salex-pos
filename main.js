const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isOnline = require('is-online');
const packageJson = require('./package.json');

let mainWindow;
let splash;
let offlineOverlay;
let monitorInterval;
const url = 'https://salepro.globevest.site';

async function createWindows() {
  // --- Splash screen ---
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

  // --- Main app window (hidden until ready) ---
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

  // --- Offline overlay (modal) ---
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

  // --- First internet check before loading ---
  if (await isOnline()) {
    mainWindow.loadURL(url);
  } else {
    offlineOverlay.show();
  }

  // --- When web app finishes loading, swap splash → main ---
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.close();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    }, 1500);
  });

  // --- Lock window title ---
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(`Sales+ POS v${packageJson.version}`);
    }
  });

  // --- Hybrid monitoring ---
  // 1. Event-based (instant feel)
  mainWindow.webContents.executeJavaScript(`
    const { ipcRenderer } = require('electron');
    window.addEventListener('offline', () => ipcRenderer.send('offline'));
    window.addEventListener('online', () => ipcRenderer.send('online'));
  `).catch(err => console.error('Failed to inject online listeners:', err));

  // 2. Backup check every 5s (safe)
  monitorInterval = setInterval(async () => {
    try {
      const online = await isOnline();
      if (!online) {
        ipcMain.emit('offline');
      } else {
        ipcMain.emit('online');
      }
    } catch (err) {
      console.error('isOnline check failed:', err);
    }
  }, 5000);

  // --- IPC handling (toggle overlay only) ---
  ipcMain.on('offline', () => {
    if (offlineOverlay && !offlineOverlay.isDestroyed() && !offlineOverlay.isVisible()) {
      offlineOverlay.show();
    }
  });
  ipcMain.on('online', () => {
    if (offlineOverlay && !offlineOverlay.isDestroyed() && offlineOverlay.isVisible()) {
      offlineOverlay.hide();
    }
  });
}

// --- Cleanup timers when quitting ---
app.on('before-quit', () => {
  if (monitorInterval) clearInterval(monitorInterval);
});

app.whenReady().then(createWindows);
