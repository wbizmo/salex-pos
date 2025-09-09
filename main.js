const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isOnline = require('is-online');
const packageJson = require('./package.json');

let mainWindow;
let splash;

async function createWindows() {
  const url = 'https://salepro.globevest.site';

  // Splash screen (fullscreen boot-style)
  splash = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: false,
    backgroundColor: '#f4f6fa',
    show: true,
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));

  // Main window (hidden at start)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, 'build/icon.ico'),
    title: `Sales+ POS v${packageJson.version}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:main', // keep cookies & sessions persistent
    },
  });
  mainWindow.setMenuBarVisibility(false);

  // Load main app in background
  mainWindow.loadURL(url);

  // Once main page loads, delay splash -> show app
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splash) splash.close();
      mainWindow.show();
    }, 2000); // delay to give seamless feel
  });

  // Force title (in case site tries to change it)
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle(`Sales+ POS v${packageJson.version}`);
  });

  // ---- Hybrid Internet Monitoring ----
  // 1. Event-based (instant feel)
  mainWindow.webContents.executeJavaScript(`
    window.addEventListener('offline', () => {
      require('electron').ipcRenderer.send('go-offline');
    });
    window.addEventListener('online', () => {
      require('electron').ipcRenderer.send('go-online');
    });
  `);

  // 2. Backup check every 5s
  setInterval(async () => {
    if (!(await isOnline())) {
      mainWindow.webContents.send('force-offline');
    }
  }, 5000);

  // Handle offline/online events
  ipcMain.on('go-offline', () => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
  ipcMain.on('go-online', () => {
    mainWindow.loadURL(url);
  });
  ipcMain.on('force-offline', () => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
}

app.whenReady().then(createWindows);
