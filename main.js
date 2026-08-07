const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { inicializarBanco, obterServicos, salvarServico, atualizarServico, excluirServico, obterDespesas, salvarDespesa, excluirDespesa } = require("./database");

let mainWindow;

function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Livro de Serviços",
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(async () => {
  await inicializarBanco();
  criarJanela();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------- IPC Handlers ---------- */

ipcMain.handle("obterServicos", () => {
  return obterServicos();
});

ipcMain.handle("salvarServico", (evento, dados) => {
  return salvarServico(dados);
});

ipcMain.handle("atualizarServico", (evento, id, dados) => {
  return atualizarServico(id, dados);
});

ipcMain.handle("excluirServico", (evento, id) => {
  return excluirServico(id);
});

ipcMain.handle("obterDespesas", () => {
  return obterDespesas();
});

ipcMain.handle("salvarDespesa", (evento, dados) => {
  return salvarDespesa(dados);
});

ipcMain.handle("excluirDespesa", (evento, id) => {
  return excluirDespesa(id);
});