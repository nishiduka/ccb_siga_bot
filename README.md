# siga-bot

Automação com Cypress para lançar doações e lançamentos manuais no [SIGA](https://siga.congregacao.org.br), a partir de CSVs e PDFs de notas fiscais. Também inclui utilitário para separar um PDF com várias notas em arquivos individuais.

## Pré-requisitos

- Node.js 18+ (recomendado)
- Conta com acesso ao SIGA
- (Opcional) Bot do Telegram para notificações de progresso/erro

## Instalação

```bash
npm install
```

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

## Configuração

Variáveis no `.env` (usadas em `cypress.config.js`):

| Variável | Descrição |
| --- | --- |
| `TELEGRAM_TOKEN` | Token do bot do Telegram |
| `TELEGRAM_CHAT_ID` | ID do chat que receberá as mensagens |

Se as variáveis não estiverem definidas, a automação segue normalmente sem enviar notificações.

## Scripts npm

| Comando | Descrição |
| --- | --- |
| `npm start` | Abre o Cypress em modo interativo (`cypress open`) |
| `npm run startHeadless` | Executa os testes headless (`cypress run`) |
| `npm run split-invoices` | Separa notas fiscais de um PDF (`scripts/split-invoices.js`) |

## Estrutura do projeto

```text
siga-bot/
├── cypress/
│   ├── e2e/
│   │   ├── doacao.cy.js              # Lançamento de doações (TES03501)
│   │   └── lancamento_manual.cy.js   # Lançamento contábil manual (CTB01002)
│   ├── fixtures/
│   │   ├── doacoes.csv               # Entrada do fluxo de doações
│   │   ├── doacoes2.csv              # Entrada do lançamento manual
│   │   └── processed-notas.json      # Notas já processadas (controle de retomada)
│   └── support/
│       ├── commands.js               # Comandos Cypress (addDonation, newManualEntry, etc.)
│       └── e2e.js                    # Notificações Telegram ao final de cada teste
├── lib/
│   └── pdf-splitter.js               # Quebra PDF por número de nota fiscal
├── notas/                            # PDFs de entrada (ignorado no git)
├── notas-extraidas/                  # PDFs individuais por nota (ignorado no git)
├── cypress.config.js                 # Tasks Node (CSV, processed notes, Telegram)
└── .env                              # Credenciais locais (não versionar)
```

## Formato do CSV

Os fixtures usam o mesmo cabeçalho:

```csv
documento,dataDocumento,valor,dataRecebimento
437069,14/07/2026,169.87,14/07/2026
```

| Coluna | Exemplo | Observação |
| --- | --- | --- |
| `documento` | `437069` | Número da nota fiscal |
| `dataDocumento` | `14/07/2026` | Data do documento (dd/mm/aaaa) |
| `valor` | `169.87` | Valor com ponto decimal |
| `dataRecebimento` | `14/07/2026` | Usado no fluxo de doações |

## Controle de notas processadas

O arquivo `cypress/fixtures/processed-notas.json` guarda os números de documento já lançados.

- Antes de processar, a automação **pula** documentos que já estão nessa lista.
- Depois de cada lançamento bem-sucedido, o documento é **acrescentado** ao arquivo.
- Isso permite retomar a execução sem duplicar lançamentos.

Para reprocessar tudo do zero, esvazie o arquivo:

```json
[]
```

## Anexos de nota fiscal

Os comandos Cypress procuram PDFs em:

```text
notas-extraidas/amazonas/notafiscal_<documento>.pdf
```

Exemplo: documento `437069` → `notas-extraidas/amazonas/notafiscal_437069.pdf`

No lançamento manual, também pode anexar a ficha de doação configurada em `commands.js` (`MANUAL_ENTRY.donationSheet`).

## Fluxos de automação

### 1. Doações (`doacao.cy.js`)

1. Abre a tela de doações (`TES/TES03501.aspx`)
2. Lê `doacoes.csv`
3. Filtra notas ainda não processadas
4. Para cada linha, chama `cy.addDonation(...)` e marca o documento em `processed-notas.json`

```bash
npm start
# No Cypress, rode o spec: cypress/e2e/doacao.cy.js
```

### 2. Lançamento manual (`lancamento_manual.cy.js`)

1. Abre a tela de lançamento (`CTB/CTB01002.aspx`)
2. Lê `doacoes2.csv` em lotes de 10 itens
3. Ignora documentos já processados
4. Para cada lote, chama `cy.newManualEntry(row)` (débitos + crédito)
5. Envia progresso no Telegram (`finalizado lote X de Y`)

Parâmetros fixos do lançamento (data, pessoa, centro de custo, contas, histórico etc.) ficam em `MANUAL_ENTRY` dentro de `cypress/support/commands.js`.

```bash
npm start
# No Cypress, rode o spec: cypress/e2e/lancamento_manual.cy.js
```

> **Importante:** o Cypress abre o SIGA no navegador. Faça login manualmente na sessão antes/durante a execução, conforme necessário.

### 3. Separar notas de um PDF

A biblioteca `lib/pdf-splitter.js` analisa um PDF com várias notas, identifica o número (`Nº 123456` ou similar) e gera um arquivo por nota:

```text
notafiscal_437069.pdf
```

Uso via script npm (quando `scripts/split-invoices.js` estiver disponível):

```bash
npm run split-invoices
```

Ou programaticamente:

```js
const { splitPdfByInvoiceNumber } = require('./lib/pdf-splitter');

splitPdfByInvoiceNumber('./notas/arquivo.pdf', './notas-extraidas/amazonas');
```

## Notificações Telegram

Em `cypress/support/e2e.js`:

- Sucesso → `✅ Processo finalizado`
- Falha → mensagem com título do teste e erro
- Lançamento manual → progresso por lote

## Dicas

- Comece com poucas linhas no CSV para validar o fluxo.
- Mantenha os PDFs das notas alinhados com os números do CSV.
- Ajuste `MANUAL_ENTRY` em `commands.js` quando mudar período, pessoa, contas ou centro de custo.
- Pastas `notas/` e `notas-extraidas/` estão no `.gitignore` — não versionam PDFs.
