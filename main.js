const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isOnline = require('is-online');
const packageJson = require('./package.json'); // to get version

let mainWindow;
let splash;

async function createWindow() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#2b303b',
    show: true
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, 'build/icon.ico'),
    title: `Sales+ POS v${packageJson.version}`, // custom window title
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  const url = 'https://salepro.globevest.site';

  setTimeout(async () => {
    if (await isOnline()) {
      mainWindow.loadURL(url);
    } else {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
    splash.close();
    mainWindow.show();
  }, 3000);

  setInterval(async () => {
    if (await isOnline()) {
      mainWindow.loadURL(url);
    } else {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  }, 10000);

  // Force title (in case site tries to change it)
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle(`Sales+ POS v${packageJson.version}`);
  });
}

app.whenReady().then(createWindow);
