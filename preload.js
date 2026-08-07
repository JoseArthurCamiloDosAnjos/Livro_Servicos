const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  obterServicos: () => ipcRenderer.invoke("obterServicos"),
  salvarServico: (dados) => ipcRenderer.invoke("salvarServico", dados),
  atualizarServico: (id, dados) => ipcRenderer.invoke("atualizarServico", id, dados),
  excluirServico: (id) => ipcRenderer.invoke("excluirServico", id),
  obterDespesas: () => ipcRenderer.invoke("obterDespesas"),
  salvarDespesa: (dados) => ipcRenderer.invoke("salvarDespesa", dados),
  excluirDespesa: (id) => ipcRenderer.invoke("excluirDespesa", id),
  salvarPdf: (dados) => ipcRenderer.invoke("salvarPdf", dados),
});