const { app, BrowserWindow } = require('electron')
const path = require('path')

const url = process.env.MEASURE_URL || 'http://localhost:5196'

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '../apps/pdf/out/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.loadURL(url)
})
