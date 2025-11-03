const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isOnline = require('is-online');
const packageJson = require('./package.json');

let mainWindow;
let splash;
let offlineOverlay;
const url = 'https://server23.salesplus.sbs';

async function createWindows() {
  // --- Splash screen ---
  splash = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: '#f4f6fa',
    show: true,
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));

  // --- Main app window ---
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#f4f6fa',
    icon: path.join(__dirname, 'build/icon.ico'),
    title: `Sales+ POS v${packageJson.version}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:main',
    },
  });
  mainWindow.setMenuBarVisibility(false);

  // --- Offline overlay (confined to mainWindow only) ---
  offlineOverlay = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    backgroundColor: '#fff',
    webPreferences: { nodeIntegration: true },
  });
  offlineOverlay.setBounds(mainWindow.getBounds());
  offlineOverlay.loadFile(path.join(__dirname, 'offline.html'));

  // --- Load target URL or offline page ---
  if (await isOnline()) {
    mainWindow.loadURL(url);
  } else {
    offlineOverlay.show();
  }

  // --- Seamless splash → app ---
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.close();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    }, 800); // shorter delay for native feel
  });

  // --- Keep title fixed ---
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(`Sales+ POS v${packageJson.version}`);
    }
  });

  // --- Monitor online/offline ---
  mainWindow.webContents.executeJavaScript(`
    const { ipcRenderer } = require('electron');
    window.addEventListener('offline', () => ipcRenderer.send('offline'));
    window.addEventListener('online', () => ipcRenderer.send('online'));
  `).catch(err => console.error('Failed to inject online listeners:', err));

  // --- Backup check every 5s ---
  setInterval(async () => {
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

  // --- IPC → toggle offline overlay ---
  ipcMain.on('offline', () => {
    if (offlineOverlay && !offlineOverlay.isDestroyed() && !offlineOverlay.isVisible()) {
      offlineOverlay.setBounds(mainWindow.getBounds());
      offlineOverlay.show();
    }
  });

  ipcMain.on('online', () => {
    if (offlineOverlay && !offlineOverlay.isDestroyed() && offlineOverlay.isVisible()) {
      offlineOverlay.hide();
    }
  });
}

app.whenReady().then(createWindows);
