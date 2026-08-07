# Livro de Serviços

Sistema desktop para cadastro, controle e contabilização de serviços prestados. Desenvolvido com Electron e SQLite.

## Funcionalidades

### Cadastro de Serviços
- Registrar serviços com nome, categoria, preço e data
- Marcar serviços como ativos ou inativos
- Editar e excluir serviços

### Controle de Pagamento
- Marcar serviços como pagos ou pendentes
- Data de pagamento registrada automaticamente
- Visualização rápida do status de cada serviço

### Despesas
- Registrar gastos com nome, valor, data e categoria
- Controle de todas as saídas financeiras

### Relatórios e Gráficos
- **Faturamento por dia** - gráfico de barras
- **Pago vs Pendente** - gráfico de pizza
- **Serviços por dia** - quantidade de trabalhos realizados
- **Cards de resumo** - total geral, pago, pendente e quantidade

### Exportação PDF
- Gerar relatório completo em PDF
- Filtrar por período (semana, mês, ano ou tudo)
- Tabela detalhada com todos os serviços

## Tecnologias

- **Electron** - Framework para aplicações desktop
- **SQLite** (sql.js) - Banco de dados local
- **Chart.js** - Gráficos interativos
- **jsPDF** - Geração de PDF

## Como Usar

### Executar em desenvolvimento
```bash
npm install
npm start
```

### Gerar executável
```bash
npm run build:win
```

O executável será gerado na pasta `dist/`.

## Estrutura do Banco

### Tabela Serviços
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT | Identificador único |
| nome | TEXT | Nome do serviço |
| categoria | TEXT | Categoria do serviço |
| preco | REAL | Preço do serviço |
| descricao | TEXT | Descrição opcional |
| ativo | INTEGER | 1 = ativo, 0 = inativo |
| pago | INTEGER | 1 = pago, 0 = pendente |
| data_criacao | TEXT | Data do serviço |
| data_pagamento | TEXT | Data do pagamento |

### Tabela Despesas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT | Identificador único |
| nome | TEXT | Nome da despesa |
| valor | REAL | Valor gasto |
| categoria | TEXT | Categoria opcional |
| data | TEXT | Data da despesa |
| descricao | TEXT | Descrição opcional |

## Licença

ISC