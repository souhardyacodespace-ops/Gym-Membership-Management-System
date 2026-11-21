const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, 'data.json');

// Ensure data.json exists
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      settings: {
        gymName: "PowerFit Gym & Fitness Club",
        phone: "+880 1700-000000",
        address: "Dhanmondi, Dhaka, Bangladesh",
        currency: "৳",
        plans: [
          { id: "monthly", name: "Monthly", durationMonths: 1, fee: 1500 },
          { id: "3months", name: "3 Months", durationMonths: 3, fee: 4000 },
          { id: "6months", name: "6 Months", durationMonths: 6, fee: 7500 },
          { id: "yearly", name: "Yearly", durationMonths: 12, fee: 14000 }
        ]
      },
      members: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readData() {
  ensureDataFile();
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading data.json:", err);
    return { settings: {}, members: [] };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error("Error writing data.json:", err);
    return { success: false, error: err.message };
  }
}

function createWindow() {
  ensureDataFile();

  // Disable default menu to prevent inspect/dev tools and inspect shortcuts
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    title: "Gym Member & Fast Billing Management",
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false // Completely disable DevTools/Inspect
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // Block DevTools shortcuts and right click inspect
  win.webContents.on('before-input-event', (event, input) => {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
    const isCtrl = input.control || input.meta;
    if (
      input.key === 'F12' ||
      (isCtrl && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'j' || input.key.toLowerCase() === 'c')) ||
      (isCtrl && input.key.toLowerCase() === 'u')
    ) {
      event.preventDefault();
    }
  });

  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools();
  });
}

app.whenReady().then(() => {
  // IPC Handlers for JSON Database
  ipcMain.handle('get-data', () => {
    return readData();
  });

  ipcMain.handle('save-member', (event, member) => {
    const db = readData();
    const existingIndex = db.members.findIndex(m => m.id === member.id);
    if (existingIndex >= 0) {
      db.members[existingIndex] = member;
    } else {
      db.members.unshift(member);
    }
    saveData(db);
    return { success: true, member };
  });

  ipcMain.handle('delete-member', (event, id) => {
    const db = readData();
    db.members = db.members.filter(m => m.id !== id);
    saveData(db);
    return { success: true };
  });

  ipcMain.handle('update-settings', (event, settings) => {
    const db = readData();
    db.settings = settings;
    saveData(db);
    return { success: true };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
