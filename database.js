const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let db;

function obterCaminhoBanco() {
  const appDir = app.isPackaged ? path.dirname(app.getPath("exe")) : app.getAppPath();
  const saveDir = path.join(appDir, "Save");

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  return path.join(saveDir, "livro_servicos.db");
}

async function inicializarBanco() {
  const SQL = await initSqlJs();
  const caminho = obterCaminhoBanco();

  if (fs.existsSync(caminho)) {
    const dados = fs.readFileSync(caminho);
    db = new SQL.Database(dados);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS servicos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      categoria TEXT,
      preco REAL NOT NULL,
      descricao TEXT,
      ativo INTEGER DEFAULT 1,
      pago INTEGER DEFAULT 0,
      data_criacao TEXT,
      data_pagamento TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS despesas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      categoria TEXT,
      data TEXT,
      descricao TEXT
    )
  `);

  // Migration: adicionar colunas se tabela já existe sem elas
  try {
    db.run("ALTER TABLE servicos ADD COLUMN data_criacao TEXT");
  } catch (e) { /* coluna já existe */ }
  try {
    db.run("ALTER TABLE servicos ADD COLUMN data_pagamento TEXT");
  } catch (e) { /* coluna já existe */ }

  salvarBanco();
}

function salvarBanco() {
  const caminho = obterCaminhoBanco();
  const dados = db.export();
  const buffer = Buffer.from(dados);
  fs.writeFileSync(caminho, buffer);
}

function obterServicos() {
  const resultado = db.exec("SELECT * FROM servicos");
  if (resultado.length === 0) return [];

  const colunas = resultado[0].columns;
  const linhas = resultado[0].values;

  return linhas.map((linha) => {
    const obj = {};
    colunas.forEach((col, i) => {
      obj[col] = linha[i];
    });
    return {
      ...obj,
      ativo: obj.ativo === 1,
      pago: obj.pago === 1,
    };
  });
}

function salvarServico(dados) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  db.run(
    "INSERT INTO servicos (id, nome, categoria, preco, descricao, ativo, pago, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, dados.nome, dados.categoria, dados.preco, dados.descricao, dados.ativo ? 1 : 0, dados.pago ? 1 : 0, dados.data_criacao || null]
  );
  salvarBanco();
  return id;
}

function atualizarServico(id, dados) {
  const campos = [];
  const valores = [];

  if (dados.nome !== undefined) {
    campos.push("nome = ?");
    valores.push(dados.nome);
  }
  if (dados.categoria !== undefined) {
    campos.push("categoria = ?");
    valores.push(dados.categoria);
  }
  if (dados.preco !== undefined) {
    campos.push("preco = ?");
    valores.push(dados.preco);
  }
  if (dados.descricao !== undefined) {
    campos.push("descricao = ?");
    valores.push(dados.descricao);
  }
  if (dados.ativo !== undefined) {
    campos.push("ativo = ?");
    valores.push(dados.ativo ? 1 : 0);
  }
  if (dados.pago !== undefined) {
    campos.push("pago = ?");
    valores.push(dados.pago ? 1 : 0);
  }
  if (dados.data_criacao !== undefined) {
    campos.push("data_criacao = ?");
    valores.push(dados.data_criacao);
  }
  if (dados.data_pagamento !== undefined) {
    campos.push("data_pagamento = ?");
    valores.push(dados.data_pagamento);
  }

  if (campos.length === 0) return false;

  valores.push(id);
  const sql = `UPDATE servicos SET ${campos.join(", ")} WHERE id = ?`;
  db.run(sql, valores);
  salvarBanco();
  return true;
}

function excluirServico(id) {
  db.run("DELETE FROM servicos WHERE id = ?", [id]);
  salvarBanco();
  return true;
}

/* ---------- Despesas ---------- */

function obterDespesas() {
  const resultado = db.exec("SELECT * FROM despesas");
  if (resultado.length === 0) return [];

  const colunas = resultado[0].columns;
  const linhas = resultado[0].values;

  return linhas.map((linha) => {
    const obj = {};
    colunas.forEach((col, i) => {
      obj[col] = linha[i];
    });
    return obj;
  });
}

function salvarDespesa(dados) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  db.run(
    "INSERT INTO despesas (id, nome, valor, categoria, data, descricao) VALUES (?, ?, ?, ?, ?, ?)",
    [id, dados.nome, dados.valor, dados.categoria || null, dados.data || null, dados.descricao || null]
  );
  salvarBanco();
  return id;
}

function excluirDespesa(id) {
  db.run("DELETE FROM despesas WHERE id = ?", [id]);
  salvarBanco();
  return true;
}

module.exports = { inicializarBanco, obterServicos, salvarServico, atualizarServico, excluirServico, obterDespesas, salvarDespesa, excluirDespesa };