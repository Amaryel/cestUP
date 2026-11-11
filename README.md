# Controle de Cestas

App de página única, mobile-first, em português (pt-BR), para controlar **estoque, compras, vendas e parcelas a receber** de cestas básicas. Sem bibliotecas externas: abra o `index.html` no navegador.

## Abas
Painel · Vendas · Clientes · Compras · Estoque · Cadastros

## Regras principais
- O estoque nunca é guardado como número fixo. Ele é calculado: compras − vendas + ajustes.
- Cobertura do item = piso(estoque ÷ quantidade por cesta). O arroz (PB e branco) é um grupo só, medido em kg por cesta.
- Estoque total de cestas = menor cobertura entre os itens.
- Custo da cesta pela última compra ou pela média (configurável). O lucro bruto não inclui embalagem, transporte, taxas nem inadimplência.
- Parcelas: 30 e 60 dias, à vista, 30 dias ou fiado, com entrada opcional. O recebimento do cliente abate primeiro as parcelas mais antigas.
- Venda bloqueada se faltar estoque ou se o arroz não somar os kg configurados.

## Dados
- Ficam no `localStorage` do navegador (`controle-cestas:v1`, formato `{v:1,state:{...}}`), salvos com atraso de 350 ms.
- Em **Cadastros → Backup** dá para exportar e importar tudo em JSON.
- Na primeira abertura (sem dados salvos) o app carrega as compras de 10/11/2026 de `seed.js`. O arquivo `controle-cestas-dados-10-11-2026.json` tem o mesmo conteúdo para importar.

## Estrutura
| Arquivo | Função |
|---|---|
| `engine.js` | Núcleo de cálculo, sem tela, com migração de dados antigos |
| `app.js` | Interface das 6 abas |
| `styles.css` | Tema verde, claro e escuro automático |
| `seed.js` | Compras e fornecedores iniciais |
| `build.js` | Junta tudo em um único `index.html` |
| `test.js`, `check-seed.js` | Testes do núcleo e conferência dos dados iniciais |

## Desenvolvimento
```bash
npm run build   # gera o index.html
npm test        # testes do núcleo e dos dados iniciais
```

> Este repositório contém compras e fornecedores reais. Mantenha-o **privado**.
