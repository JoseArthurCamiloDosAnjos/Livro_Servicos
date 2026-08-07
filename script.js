/* ===================================================================
   LIVRO DE SERVIÇOS — lógica
   Persistência via SQLite (Electron).
=================================================================== */

/* ---------- Estado ---------- */

let servicos = [];
let despesas = [];
let edicaoAtualId = null;
let graficos = {};

/* ---------- Utilitários ---------- */

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(isoData) {
  if (!isoData) return "—";
  const [ano, mes, dia] = isoData.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function obterDataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function obterServicosNoPeriodo(periodo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return servicos.filter((s) => {
    if (!s.data_criacao) return periodo === "tudo";

    const dataServico = new Date(s.data_criacao + "T00:00:00");

    if (periodo === "semana") {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      return dataServico >= inicioSemana && dataServico <= hoje;
    }
    if (periodo === "mes") {
      return dataServico.getFullYear() === hoje.getFullYear() && dataServico.getMonth() === hoje.getMonth();
    }
    if (periodo === "ano") {
      return dataServico.getFullYear() === hoje.getFullYear();
    }
    return true; // "tudo"
  });
}

function obterNomePeriodo(periodo) {
  const nomes = {
    semana: "Esta Semana",
    mes: "Este Mês",
    ano: "Este Ano",
    tudo: "Todos os Períodos",
  };
  return nomes[periodo] || periodo;
}

/* ===================================================================
   NAVEGAÇÃO ENTRE TELAS
=================================================================== */

const abas = document.querySelectorAll(".aba");
const telas = document.querySelectorAll(".tela");

function irParaTela(nomeTela) {
  telas.forEach((tela) => {
    tela.hidden = tela.dataset.tela !== nomeTela;
  });
  abas.forEach((aba) => {
    const ativa = aba.dataset.tela === nomeTela;
    aba.toggleAttribute("aria-current", ativa);
    if (ativa) aba.setAttribute("aria-current", "page");
    else aba.removeAttribute("aria-current");
  });
  if (nomeTela === "lista") renderizarLista();
  if (nomeTela === "despesas") renderizarDespesas();
  if (nomeTela === "relatorios") renderizarRelatorios();
}

abas.forEach((aba) => {
  aba.addEventListener("click", () => irParaTela(aba.dataset.tela));
});

document.querySelectorAll("[data-ir-para]").forEach((botao) => {
  botao.addEventListener("click", () => irParaTela(botao.dataset.irPara));
});

/* ===================================================================
   TELA I — CADASTRO / EDIÇÃO DE SERVIÇO
=================================================================== */

const formServico = document.getElementById("form-servico");
const campoId = document.getElementById("servico-id");
const campoNome = document.getElementById("servico-nome");
const campoCategoria = document.getElementById("servico-categoria");
const campoPreco = document.getElementById("servico-preco");
const campoDescricao = document.getElementById("servico-descricao");
const campoAtivo = document.getElementById("servico-ativo");
const campoData = document.getElementById("servico-data");
const btnSalvar = document.getElementById("btn-salvar");
const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");
const mensagemCadastro = document.getElementById("mensagem-cadastro");
const listaCategorias = document.getElementById("lista-categorias");

function atualizarDatalistCategorias() {
  const categorias = [...new Set(servicos.map((s) => s.categoria).filter(Boolean))];
  listaCategorias.innerHTML = categorias.map((c) => `<option value="${escaparHtml(c)}">`).join("");
}

function limparFormServico() {
  formServico.reset();
  campoId.value = "";
  campoAtivo.checked = true;
  campoData.value = obterDataHoje();
  edicaoAtualId = null;
  btnSalvar.textContent = "Registrar serviço";
  btnCancelarEdicao.hidden = true;
}

formServico.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = campoNome.value.trim();
  const preco = parseFloat(campoPreco.value);

  if (!nome) {
    exibirMensagem(mensagemCadastro, "Informe o nome do serviço.", "erro");
    campoNome.focus();
    return;
  }
  if (isNaN(preco) || preco < 0) {
    exibirMensagem(mensagemCadastro, "Informe um preço válido.", "erro");
    campoPreco.focus();
    return;
  }

  const dados = {
    nome,
    categoria: campoCategoria.value.trim(),
    preco,
    descricao: campoDescricao.value.trim(),
    ativo: campoAtivo.checked,
    data_criacao: campoData.value || obterDataHoje(),
  };

  if (edicaoAtualId) {
    await window.api.atualizarServico(edicaoAtualId, dados);
    exibirMensagem(mensagemCadastro, "Serviço atualizado com sucesso.", "sucesso");
  } else {
    dados.pago = false;
    await window.api.salvarServico(dados);
    exibirMensagem(mensagemCadastro, "Serviço registrado no livro.", "sucesso");
  }

  servicos = await window.api.obterServicos();
  atualizarDatalistCategorias();
  limparFormServico();
});

btnCancelarEdicao.addEventListener("click", () => {
  limparFormServico();
  exibirMensagem(mensagemCadastro, "", "");
});

function exibirMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensagem" + (tipo ? " " + tipo : "");
  if (texto) {
    setTimeout(() => {
      if (elemento.textContent === texto) elemento.textContent = "";
    }, 4000);
  }
}

function iniciarEdicaoServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;

  campoId.value = servico.id;
  campoNome.value = servico.nome;
  campoCategoria.value = servico.categoria || "";
  campoPreco.value = servico.preco;
  campoDescricao.value = servico.descricao || "";
  campoAtivo.checked = servico.ativo;
  campoData.value = servico.data_criacao || obterDataHoje();

  edicaoAtualId = servico.id;
  btnSalvar.textContent = "Salvar alterações";
  btnCancelarEdicao.hidden = false;

  irParaTela("cadastro");
  campoNome.focus();
}

/* ===================================================================
   TELA II — LISTA DE SERVIÇOS
=================================================================== */

const corpoTabelaServicos = document.getElementById("corpo-tabela-servicos");
const listaVazia = document.getElementById("lista-vazia");
const buscaServico = document.getElementById("busca-servico");
const filtroCategoria = document.getElementById("filtro-categoria");
const filtroStatus = document.getElementById("filtro-status");

function atualizarFiltroCategorias() {
  const categorias = [...new Set(servicos.map((s) => s.categoria).filter(Boolean))].sort();
  const selecionado = filtroCategoria.value;
  filtroCategoria.innerHTML =
    '<option value="">Todas as categorias</option>' +
    categorias.map((c) => `<option value="${escaparHtml(c)}">${escaparHtml(c)}</option>`).join("");
  filtroCategoria.value = categorias.includes(selecionado) ? selecionado : "";
}

function renderizarLista() {
  atualizarFiltroCategorias();

  const termo = buscaServico.value.trim().toLowerCase();
  const categoria = filtroCategoria.value;
  const status = filtroStatus.value;

  const filtrados = servicos.filter((s) => {
    if (termo && !s.nome.toLowerCase().includes(termo)) return false;
    if (categoria && s.categoria !== categoria) return false;
    if (status === "ativo" && !s.ativo) return false;
    if (status === "inativo" && s.ativo) return false;
    return true;
  });

  if (filtrados.length === 0) {
    corpoTabelaServicos.innerHTML = "";
    listaVazia.hidden = false;
    listaVazia.querySelector("p").textContent =
      servicos.length === 0
        ? "Nenhum serviço registrado ainda."
        : "Nenhum serviço encontrado com esses filtros.";
    return;
  }

  listaVazia.hidden = true;

  corpoTabelaServicos.innerHTML = filtrados
    .map(
      (s) => `
    <tr>
      <td class="nome-servico-cel">${escaparHtml(s.nome)}</td>
      <td>${s.categoria ? `<span class="categoria-tag">${escaparHtml(s.categoria)}</span>` : "—"}</td>
      <td class="col-preco">${formatarMoeda(s.preco)}</td>
      <td><span class="status-pill ${s.ativo ? "ativo" : "inativo"}">${s.ativo ? "Ativo" : "Inativo"}</span></td>
      <td><span class="status-pill ${s.pago ? "pago" : "pendente"}">${s.pago ? "Pago" : "Pendente"}</span></td>
      <td class="col-acoes">
        <button class="acao-link" data-pagar="${s.id}">${s.pago ? "Marcar como não pago" : "Marcar como pago"}</button>
        <button class="acao-link" data-editar="${s.id}">Editar</button>
        <button class="acao-link excluir" data-excluir="${s.id}">Excluir</button>
      </td>
    </tr>`
    )
    .join("");

  corpoTabelaServicos.querySelectorAll("[data-pagar]").forEach((botao) => {
    botao.addEventListener("click", () => alternarPagamento(botao.dataset.pagar));
  });
  corpoTabelaServicos.querySelectorAll("[data-editar]").forEach((botao) => {
    botao.addEventListener("click", () => iniciarEdicaoServico(botao.dataset.editar));
  });
  corpoTabelaServicos.querySelectorAll("[data-excluir]").forEach((botao) => {
    botao.addEventListener("click", () => excluirServico(botao.dataset.excluir));
  });
}

async function alternarPagamento(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;

  const novoPago = !servico.pago;
  const dados = { pago: novoPago };

  if (novoPago) {
    dados.data_pagamento = obterDataHoje();
  } else {
    dados.data_pagamento = null;
  }

  await window.api.atualizarServico(id, dados);
  servicos = await window.api.obterServicos();
  renderizarLista();
}

async function excluirServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!servico) return;

  if (!confirm(`Remover "${servico.nome}" do livro?`)) return;

  await window.api.excluirServico(id);
  servicos = await window.api.obterServicos();
  atualizarDatalistCategorias();
  renderizarLista();
}

[buscaServico, filtroCategoria, filtroStatus].forEach((el) => {
  el.addEventListener("input", renderizarLista);
  el.addEventListener("change", renderizarLista);
});

/* ===================================================================
   TELA III — DESPESAS
=================================================================== */

const formDespesa = document.getElementById("form-despesa");
const campoDespesaNome = document.getElementById("despesa-nome");
const campoDespesaValor = document.getElementById("despesa-valor");
const campoDespesaData = document.getElementById("despesa-data");
const campoDespesaCategoria = document.getElementById("despesa-categoria");
const campoDespesaDescricao = document.getElementById("despesa-descricao");
const btnSalvarDespesa = document.getElementById("btn-salvar-despesa");
const mensagemDespesa = document.getElementById("mensagem-despesa");
const corpoTabelaDespesas = document.getElementById("corpo-tabela-despesas");
const despesasVazia = document.getElementById("despesas-vazia");
const listaCategoriasDespesa = document.getElementById("lista-categorias-despesa");

function atualizarDatalistCategoriasDespesa() {
  const categorias = [...new Set(despesas.map((d) => d.categoria).filter(Boolean))];
  listaCategoriasDespesa.innerHTML = categorias.map((c) => `<option value="${escaparHtml(c)}">`).join("");
}

function limparFormDespesa() {
  formDespesa.reset();
  campoDespesaData.value = obterDataHoje();
}

formDespesa.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = campoDespesaNome.value.trim();
  const valor = parseFloat(campoDespesaValor.value);

  if (!nome) {
    exibirMensagem(mensagemDespesa, "Informe o nome da despesa.", "erro");
    campoDespesaNome.focus();
    return;
  }
  if (isNaN(valor) || valor <= 0) {
    exibirMensagem(mensagemDespesa, "Informe um valor válido.", "erro");
    campoDespesaValor.focus();
    return;
  }

  const dados = {
    nome,
    valor,
    categoria: campoDespesaCategoria.value.trim(),
    data: campoDespesaData.value || obterDataHoje(),
    descricao: campoDespesaDescricao.value.trim(),
  };

  await window.api.salvarDespesa(dados);
  exibirMensagem(mensagemDespesa, "Despesa registrada com sucesso.", "sucesso");

  despesas = await window.api.obterDespesas();
  atualizarDatalistCategoriasDespesa();
  limparFormDespesa();
  renderizarDespesas();
});

function renderizarDespesas() {
  atualizarDatalistCategoriasDespesa();

  if (despesas.length === 0) {
    corpoTabelaDespesas.innerHTML = "";
    despesasVazia.hidden = false;
    return;
  }

  despesasVazia.hidden = true;

  const sorted = [...despesas].sort((a, b) => (a.data < b.data ? 1 : -1));

  corpoTabelaDespesas.innerHTML = sorted
    .map(
      (d) => `
    <tr>
      <td class="nome-servico-cel">${escaparHtml(d.nome)}</td>
      <td>${d.categoria ? `<span class="categoria-tag">${escaparHtml(d.categoria)}</span>` : "—"}</td>
      <td class="col-preco">${formatarMoeda(d.valor)}</td>
      <td>${formatarData(d.data)}</td>
      <td class="col-acoes">
        <button class="acao-link excluir" data-excluir-despesa="${d.id}">Excluir</button>
      </td>
    </tr>`
    )
    .join("");

  corpoTabelaDespesas.querySelectorAll("[data-excluir-despesa]").forEach((botao) => {
    botao.addEventListener("click", () => excluirDespesa(botao.dataset.excluirDespesa));
  });
}

async function excluirDespesa(id) {
  if (!confirm("Remover esta despesa?")) return;

  await window.api.excluirDespesa(id);
  despesas = await window.api.obterDespesas();
  renderizarDespesas();
}

/* ===================================================================
   TELA IV — RELATÓRIOS / GRÁFICOS
=================================================================== */

const cardTotalGeral = document.getElementById("card-total-geral");
const cardTotalPago = document.getElementById("card-total-pago");
const cardTotalPendente = document.getElementById("card-total-pendente");
const cardQuantidade = document.getElementById("card-quantidade");
const relatoriosVazio = document.getElementById("relatorios-vazio");
const graficosContainer = document.querySelector(".graficos-container");
const filtroPeriodo = document.getElementById("filtro-periodo");
const btnExportarPdf = document.getElementById("btn-exportar-pdf");

function processarDadosRelatorios(servicosFiltrados) {
  const totalGeral = servicosFiltrados.reduce((soma, s) => soma + s.preco, 0);
  const totalPago = servicosFiltrados.filter((s) => s.pago).reduce((soma, s) => soma + s.preco, 0);
  const totalPendente = totalGeral - totalPago;
  const quantidade = servicosFiltrados.length;

  return { totalGeral, totalPago, totalPendente, quantidade };
}

function processarFaturamentoPorDia(servicosFiltrados) {
  const porDia = {};

  servicosFiltrados.forEach((s) => {
    const data = s.data_criacao || "Sem data";
    if (!porDia[data]) porDia[data] = 0;
    porDia[data] += s.preco;
  });

  const entradas = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0]));
  const ultimas30 = entradas.slice(-30);

  return {
    labels: ultimas30.map(([data]) => formatarData(data)),
    valores: ultimas30.map(([, valor]) => valor),
  };
}

function processarServicosPorDia(servicosFiltrados) {
  const porDia = {};

  servicosFiltrados.forEach((s) => {
    const data = s.data_criacao || "Sem data";
    if (!porDia[data]) porDia[data] = 0;
    porDia[data]++;
  });

  const entradas = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0]));
  const ultimas30 = entradas.slice(-30);

  return {
    labels: ultimas30.map(([data]) => formatarData(data)),
    quantidades: ultimas30.map(([, qtd]) => qtd),
  };
}

function processarPagamentoPizza(servicosFiltrados) {
  let pago = 0;
  let pendente = 0;

  servicosFiltrados.forEach((s) => {
    if (s.pago) {
      pago += s.preco;
    } else {
      pendente += s.preco;
    }
  });

  return { pago, pendente };
}

function criarGraficos(servicosFiltrados) {
  const cores = {
    verde: "#2f6b4f",
    vermelho: "#9c3d3d",
    latao: "#a9822f",
    lataoClaro: "#cf9f3f",
    papelLinha: "#d9cfb4",
    tinta: "#1e2f27",
  };

  // Gráfico de faturamento por dia
  const faturamento = processarFaturamentoPorDia(servicosFiltrados);
  if (graficos.faturamento) graficos.faturamento.destroy();
  graficos.faturamento = new Chart(document.getElementById("grafico-faturamento"), {
    type: "bar",
    data: {
      labels: faturamento.labels,
      datasets: [{
        label: "Faturamento (R$)",
        data: faturamento.valores,
        backgroundColor: cores.latao + "99",
        borderColor: cores.latao,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatarMoeda(ctx.raw),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (valor) => formatarMoeda(valor),
          },
          grid: { color: cores.papelLinha + "66" },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });

  // Gráfico de pagamento (pizza)
  const pagamento = processarPagamentoPizza(servicosFiltrados);
  if (graficos.pagamento) graficos.pagamento.destroy();
  graficos.pagamento = new Chart(document.getElementById("grafico-pagamento"), {
    type: "doughnut",
    data: {
      labels: ["Pago", "Pendente"],
      datasets: [{
        data: [pagamento.pago, pagamento.pendente],
        backgroundColor: [cores.verde, cores.vermelho],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 16,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatarMoeda(ctx.raw)}`,
          },
        },
      },
      cutout: "60%",
    },
  });

  // Gráfico de quantidade por dia
  const quantidade = processarServicosPorDia(servicosFiltrados);
  if (graficos.quantidade) graficos.quantidade.destroy();
  graficos.quantidade = new Chart(document.getElementById("grafico-quantidade"), {
    type: "bar",
    data: {
      labels: quantidade.labels,
      datasets: [{
        label: "Serviços",
        data: quantidade.quantidades,
        backgroundColor: cores.verde + "99",
        borderColor: cores.verde,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: cores.papelLinha + "66" },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}

function renderizarRelatorios() {
  const periodo = filtroPeriodo.value;
  const servicosFiltrados = obterServicosNoPeriodo(periodo);

  if (servicos.length === 0) {
    relatoriosVazio.hidden = false;
    graficosContainer.style.display = "none";
    return;
  }

  relatoriosVazio.hidden = true;
  graficosContainer.style.display = "";

  const { totalGeral, totalPago, totalPendente, quantidade } = processarDadosRelatorios(servicosFiltrados);

  cardTotalGeral.textContent = formatarMoeda(totalGeral);
  cardTotalPago.textContent = formatarMoeda(totalPago);
  cardTotalPendente.textContent = formatarMoeda(totalPendente);
  cardQuantidade.textContent = quantidade;

  criarGraficos(servicosFiltrados);
}

/* ===================================================================
   EXPORTAÇÃO PDF
=================================================================== */

async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const periodo = filtroPeriodo.value;
  const servicosFiltrados = obterServicosNoPeriodo(periodo);
  const nomePeriodo = obterNomePeriodo(periodo);

  // Cores
  const corTinta = [30, 47, 39];
  const corLatao = [169, 130, 47];
  const corVerde = [47, 107, 79];
  const corVermelho = [156, 61, 61];

  // Cabeçalho
  doc.setFontSize(20);
  doc.setTextColor(...corTinta);
  doc.text("Livro de Serviços", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...corLatao);
  doc.text(`Relatório — ${nomePeriodo}`, 105, 28, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${formatarData(obterDataHoje())}`, 105, 34, { align: "center" });

  // Linha separadora
  doc.setDrawColor(...corLatao);
  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);

  // Resumo
  const { totalGeral, totalPago, totalPendente, quantidade } = processarDadosRelatorios(servicosFiltrados);

  doc.setFontSize(11);
  doc.setTextColor(...corTinta);
  doc.text("Resumo", 20, 48);

  doc.setFontSize(10);
  doc.text(`Total Geral: ${formatarMoeda(totalGeral)}`, 20, 56);
  doc.text(`Total Pago: ${formatarMoeda(totalPago)}`, 20, 63);
  doc.text(`Total Pendente: ${formatarMoeda(totalPendente)}`, 20, 70);
  doc.text(`Quantidade de Serviços: ${quantidade}`, 20, 77);

  // Tabela de serviços
  let y = 90;
  doc.setFontSize(11);
  doc.setTextColor(...corTinta);
  doc.text("Detalhamento dos Serviços", 20, y);
  y += 8;

  // Cabeçalho da tabela
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Data", 20, y);
  doc.text("Serviço", 40, y);
  doc.text("Categoria", 110, y);
  doc.text("Preço", 145, y);
  doc.text("Status", 170, y);
  y += 2;

  doc.setDrawColor(200);
  doc.line(20, y, 190, y);
  y += 5;

  // Dados da tabela
  doc.setFontSize(8);
  doc.setTextColor(...corTinta);

  servicosFiltrados.forEach((s, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const status = s.pago ? "Pago" : "Pendente";
    const corStatus = s.pago ? corVerde : corVermelho;

    doc.text(formatarData(s.data_criacao) || "—", 20, y);
    doc.text(s.nome.substring(0, 30), 40, y);
    doc.text(s.categoria || "—", 110, y);
    doc.text(formatarMoeda(s.preco), 145, y);
    doc.setTextColor(...corStatus);
    doc.text(status, 170, y);
    doc.setTextColor(...corTinta);

    y += 6;

    // Linha alternada
    if (index % 2 === 0) {
      doc.setFillColor(246, 242, 232);
      doc.rect(20, y - 5, 170, 6, "F");
    }
  });

  // Rodapé
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${totalPages} — Livro de Serviços`,
      105,
      290,
      { align: "center" }
    );
  }

  // Salvar
  const nomeArquivo = `relatorio_${periodo}_${obterDataHoje().replace(/-/g, "")}.pdf`;
  doc.save(nomeArquivo);
}

// Event listeners
filtroPeriodo.addEventListener("change", renderizarRelatorios);
btnExportarPdf.addEventListener("click", exportarPDF);

/* ===================================================================
   INICIALIZAÇÃO
=================================================================== */

async function inicializar() {
  servicos = await window.api.obterServicos();
  despesas = await window.api.obterDespesas();
  atualizarDatalistCategorias();
  atualizarFiltroCategorias();
  campoData.value = obterDataHoje();
  campoDespesaData.value = obterDataHoje();
  irParaTela("cadastro");
}

inicializar();