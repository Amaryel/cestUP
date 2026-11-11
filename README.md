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
- Cada conta começa vazia. Os dados reais não ficam no código: use Cadastros → Backup → Importar.

## Nuvem (Supabase) e uso sem internet
1. No SQL Editor do projeto Supabase, rode `supabase/controle-cestas.sql` (cria a tabela `controle_cestas_state` com RLS: cada usuário só acessa a própria linha; visitante não acessa nada).
2. Ao abrir o app aparece a tela de entrada com **Entrar** e **Criar conta** (e-mail e senha). Se o Supabase exigir confirmação por e-mail, o app avisa para confirmar antes do primeiro acesso.
3. O app sempre grava primeiro no aparelho. Sem internet continua funcionando e marca "pendente"; ao voltar a conexão, envia sozinho.
4. Se dois aparelhos alterarem os dados separadamente, o app não sobrescreve nada: mostra as duas versões e pede para escolher (a outra fica guardada como cópia).
5. Recomendado no painel do Supabase: desativar novos cadastros (Authentication → Sign In / Providers → "Allow new users to sign up") se só você usa o app.

## Instalar como app (PWA)
Hospede a pasta em HTTPS (ex.: GitHub Pages) e abra no Chrome/Edge: aparece "Instalar app" no topo (Windows e Android). No iPhone: Compartilhar → Adicionar à Tela de Início. Depois da primeira abertura o app abre sem internet (`sw.js` guarda os arquivos).

## Estrutura
| Arquivo | Função |
|---|---|
| `engine.js` | Núcleo de cálculo, sem tela, com migração de dados antigos |
| `app.js` | Interface das 6 abas |
| `sync.js` | Login, envio/recebimento com o Supabase, fila offline e conflitos |
| `sw.template.js` → `sw.js` | Service worker (gerado pelo build com versão nova a cada mudança) |
| `manifest.webmanifest`, `icons/` | Dados de instalação e ícones |
| `supabase/controle-cestas.sql` | Tabela, RLS e gatilho de revisão |
| `styles.css` | Tema pinheiro e milho, claro e escuro automático |
| `build.js` | Junta tudo em um único `index.html` |
| `test.js` | Testes do núcleo de cálculo |

## Desenvolvimento
```bash
npm run build   # gera o index.html
npm test        # testes do núcleo
```

