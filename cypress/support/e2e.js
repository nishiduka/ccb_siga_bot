import 'cypress-wait-until';

// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

const formatErrorMessage = (err) => {
  if (!err) {
    return 'Erro desconhecido';
  }

  if (typeof err === 'string') {
    return err;
  }

  if (err.message) {
    return err.message;
  }

  return JSON.stringify(err);
};

afterEach(function () {
  if (this.currentTest?.state === 'failed') {
    const testTitle = this.currentTest.fullTitle || this.currentTest.title;
    const errorMessage = formatErrorMessage(
      this.currentTest.err?.message || this.currentTest.err
    );
    const message = `❌ Erro no Cypress\nTeste: ${testTitle}\nErro: ${errorMessage}`;

    cy.task('sendTelegramMessage', message, { log: false });
  } else {
    cy.task('sendTelegramMessage', '✅ Processo finalizado', { log: false });
  }
});
