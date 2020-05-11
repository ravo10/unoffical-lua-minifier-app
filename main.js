const { app, BrowserWindow } = require('electron');
const path = require('path')

// Lag vidaug
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 760,
        height: 860,
        minWidth: 730,
        minHeight: 820,
        frame: false,
        backgroundColor: '#ffffff',
        icon: path.join(__dirname, 'dist', 'assets', 'logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

    // Konsoll
    // mainWindow.webContents.openDevTools()

    mainWindow.on('close', function () { win = null });
}

app.allowRendererProcessReuse = true;
app.whenReady().then(createWindow)
app.on('window-all-closed', function () {
    // For MacOS...
    if (process.platform !== 'darwin') app.quit()
});
app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Andre ting
require('./main-minifier');
