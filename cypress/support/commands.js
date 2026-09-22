// Use `cy.task('fileExists', path)` to check filesystem from Node (Cypress plugin)

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

const MANUAL_ENTRY = {
  date: '31/08/2026',
  person: 'PLENS MATERIAL P CONSTRUÇÃO',
  costCenter: '22-0625',
  history: '99',
  debitAccount: '1118',
  creditAccount: '2108',
  complement:
    'ajuste de exercícios anteriores ref doações de 2024 e 2025 Construcao Central',
  donationSheet: 'notas-extraidas/ficha_doacao_amazonas.pdf',
};

function toBrl(value) {
  return Number(value).toFixed(2).replace('.', ',');
}

function typeAndTab(selector, value) {
  cy.typeText(selector, value);
  cy.press(Cypress.Keyboard.Keys.TAB);
  cy.waitForLoading();
}

function attachFileIfExists(filePath, selector) {
  cy.task('fileExists', filePath).then((exists) => {
    if (exists) {
      cy.get(selector).selectFile(filePath, { force: true });
    }
  });
  cy.waitForLoading();
}

function attachDonationSheetIfExists() {
  cy.task('fileExists', MANUAL_ENTRY.donationSheet).then((exists) => {
    if (!exists) {
      return;
    }

    cy.get('body').then(($body) => {
      const selector = ['[id="f_anexos_0"]', '[id="f_anexos_2"]'].find(
        (sel) => $body.find(sel).length
      );

      if (selector) {
        cy.get(selector).selectFile(MANUAL_ENTRY.donationSheet, {
          force: true,
        });
      }
    });
  });
}

function attachItemDocuments(documento) {
  cy.get('body').then(($body) => {
    const nextId = $body
      .find('[name="f_anexos"]')
      .filter((_, item) => item.value === '')
      .first()
      .attr('id');

    if (!nextId) {
      return;
    }

    attachFileIfExists(
      `notas-extraidas/amazonas/notafiscal_${documento}.pdf`,
      `[id="${nextId}"]`
    );
  });

  attachDonationSheetIfExists();
}

function openItemForm() {
  cy.get('#btn-adicionar').click();
  cy.waitForLoading();
  cy.contains('Histórico', { timeout: 90000 }).should('exist');
  cy.waitForLoading();
  cy.wait(2000);
}

function fillAccountingLine({ account, person } = {}) {
  cy.select2('#s2id_f_conta', account);
  cy.waitForLoading();
  cy.select2('[id="s2id_f_centrocusto"]', MANUAL_ENTRY.costCenter);
  cy.waitForLoading();

  if (person) {
    cy.select2Search('#s2id_f_pessoaItem', person);
    cy.waitForLoading();
  }

  cy.select2('[id="s2id_f_historico"]', MANUAL_ENTRY.history);
  cy.waitForLoading();
}

function insertItem() {
  cy.get('#btn-inserir-item').click({ force: true });
}

function fillHeader(total) {
  cy.waitForLoading();
  cy.get('body').type('{esc}');
  typeAndTab('[name="f_data"]', MANUAL_ENTRY.date);
  cy.typeText('[name="f_valor"]', toBrl(total));
  cy.waitForLoading();
  cy.select2Search('#s2id_f_pessoa', MANUAL_ENTRY.person);
  cy.waitForLoading();
}

function addDebitItem(item, isFirst) {
  openItemForm();

  cy.get('[name="f_documento"]', { timeout: 90000 }).should('be.visible');

  if (isFirst) {
    typeAndTab('[name="f_datadocumento"]', MANUAL_ENTRY.date);
  }

  cy.get('[name="f_documento"]', { timeout: 90000 }).clear();
  typeAndTab('[name="f_documento"]', item.documento);
  typeAndTab('[name="f_valordebito"]', toBrl(item.valor));
  fillAccountingLine({
    account: MANUAL_ENTRY.debitAccount,
    person: isFirst ? MANUAL_ENTRY.person : undefined,
  });

  if (isFirst) {
    cy.get('[name="f_complemento"]').type(MANUAL_ENTRY.complement);
  }

  insertItem();
  cy.waitForLoading();
}

function addCreditItem(items, total) {
  openItemForm();

  cy.get('[name="f_documento"]', { timeout: 90000 }).clear();
  cy.press(Cypress.Keyboard.Keys.TAB);
  cy.waitForLoading();

  typeAndTab('[name="f_valorcredito"]', toBrl(total));
  fillAccountingLine({ account: MANUAL_ENTRY.creditAccount });

  insertItem();
  cy.waitForLoading();

  cy.wrap(items).each((item) => {
    attachItemDocuments(item.documento);
    cy.wait(500);
  });
}

/***
 * Comando personalizado para lançamento manual (débitos + crédito)
 * @param {Array} items - Array de objetos contendo os dados das doações
 * @param {string} items[0].documento - Número do documento
 * @param {string} items[0].valor - Valor da doação (formato: "100.00")
 */
Cypress.Commands.add('newManualEntry', (items) => {
  const total = items.reduce((sum, item) => sum + parseFloat(item.valor), 0);

  fillHeader(total);
  cy.wrap(items).each((item, index) => addDebitItem(item, index === 0));
  addCreditItem(items, total);

  cy.get('[data-comando="F"]').click({ force: true });
  // cy.get('[data-comando="N"]').click({ force: true });
  cy.waitForLoading();

  cy.visit('https://siga.congregacao.org.br/CTB/CTB01002.aspx');
});

Cypress.Commands.add('addDonation', (item) => {
  cy.waitForLoading();
  attachItemDocuments(item.documento);

  cy.typeText('[name="f_datadocumento"]', item.dataDocumento + '{enter}');

  cy.waitForLoading();

  cy.select2('#s2id_f_tipodocumento', 'NOTA FISCAL');

  cy.waitForLoading();

  cy.typeText('[name="f_documento"]', item.documento + '{enter}');
  cy.typeText('[name="f_valor"]', item.valor + '{enter}');

  cy.waitForLoading();

  cy.select2('#s2id_f_doacao', '1118 - BR 22-0625 - CENTRO');

  cy.waitForLoading();

  cy.select2('#s2id_f_centrocusto', 'BR 22-0625 - CENTRO');

  cy.waitForLoading();

  // data recebimento
  cy.typeText('[name="f_datarecebimento"]', item.dataRecebimento + '{enter}');

  cy.waitForLoading();

  cy.select2('#s2id_f_conta', '4010 - OFERTA PARA CONSTRUÇÃO');

  cy.waitForLoading();

  cy.typeText('[name="f_complemento"]', 'PLENS MATERIAIS P CONSTRUCAO{enter}');

  // Salvar o formulário
  cy.get('[data-comando="F"]').click({ force: true });

  // Salvar e novo
  // cy.get('[data-comando="N"]').click();

  cy.waitForLoading();

  cy.get('.modal-content > .modal-body', { timeout: 90000 }).should(
    'contain',
    'Informações armazenadas com sucesso!'
  );
  cy.get('.modal-content > .modal-footer > .btn', { timeout: 90000 }).click();

  // cy.url({ timeout: 90000 }).should('include', '/TES/TES03501.aspx');
  cy.waitForLoading();
  cy.visit('https://siga.congregacao.org.br/TES/TES03502.aspx');
  // cy.reload();
});

function closeOpenSelect2() {
  cy.get('body').then(($body) => {
    if ($body.find('#select2-drop-mask').length) {
      cy.get('#select2-drop-mask').click({ force: true });
    }
  });
}

function stripSelect2Value(value) {
  return String(value)
    .replace(/\{enter\}$/i, '')
    .trim();
}

Cypress.Commands.add('select2', (selector, value) => {
  const optionText = stripSelect2Value(value);

  cy.waitForLoading();
  closeOpenSelect2();
  cy.waitForLoading();

  cy.get(selector, { timeout: 30000 })
    .closest('.select2-container')
    .find('a.select2-choice')
    .click({ force: true });

  cy.get(`#select2-drop .select2-results li`, { timeout: 30000 })
    .contains(optionText)
    .closest('.select2-result')
    .trigger('mouseup', {
      waitForAnimations: false,
      force: true,
    });

  cy.waitForLoading();
});

Cypress.Commands.add('select2Search', (selector, value) => {
  const searchTerm = stripSelect2Value(value);

  cy.waitForLoading();
  closeOpenSelect2();
  cy.waitForLoading();

  cy.get(selector, { timeout: 30000 })
    .closest('.select2-container')
    .find('a.select2-choice')
    .click({ force: true });

  cy.get('#select2-drop input.select2-input:visible', { timeout: 30000 })
    .should('be.visible')
    .clear({ force: true })
    .type(`${searchTerm}{enter}`, { delay: 100, force: true });

  cy.waitForLoading();
  cy.get('#select2-drop .select2-searching', { timeout: 30000 }).should(
    'not.exist'
  );

  cy.get('#select2-drop .select2-results li.select2-result-selectable', {
    timeout: 30000,
  })
    .should('have.length.at.least', 1)
    .then(($items) => {
      const term = searchTerm.toLowerCase();
      const match = $items.filter((_, el) =>
        el.innerText.toLowerCase().includes(term)
      );

      cy.wrap(match.length ? match.first() : $items.first())
        .closest('.select2-result')
        .trigger('mouseup', {
          waitForAnimations: false,
          force: true,
        });
    });

  cy.waitForLoading();
});

Cypress.Commands.add('waitForLoading', () => {
  cy.get('.blockMsg > div', { timeout: 90000 }).should('not.exist');
});

Cypress.Commands.add('typeText', (selector, text) => {
  cy.get(selector, { timeout: 90000 })
    // .should('be.enabled')
    // .click({ force: true })
    // .wait(500)
    .type(text, { delay: 300, force: true });
  // .wait(1000);
});
