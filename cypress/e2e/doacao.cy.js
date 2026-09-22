describe('Doações em lote via CSV', () => {
  it('Importa todas as doações do CSV', () => {
    cy.visit('https://siga.congregacao.org.br/TES/TES03501.aspx');
    // cy.visit('https://siga.congregacao.org.br');
    // cy.url({ timeout: 90000 }).should('include', '/SIS/SIS99908.aspx');
    // cy.get('.blockMsg > div', { timeout: 90000 }).should('not.exist');

    // cy.get('[name="f_executar_programa"]').type('TES03501{enter}', {
    //   delay: 100,
    // });
    // cy.get('#btn_executar_programa > .icon-arrow-right').click();

    cy.url({ timeout: 90000 }).should('include', '/TES/TES03501.aspx');
    cy.get('.blockMsg > div', { timeout: 90000 }).should('not.exist');

    cy.get('.btn-toolbar > :nth-child(1) > .btn').click();
    cy.get('.blockMsg > div', { timeout: 90000 }).should('not.exist');

    cy.task('readCsv', 'doacoes.csv').then((rows) => {
      cy.task('readProcessedNotes').then((processedNotes) => {
        const processedSet = new Set(
          (processedNotes || []).map((documento) => String(documento).trim())
        );

        const rowsToProcess = rows.filter(
          (row) => !processedSet.has(String(row.documento || '').trim())
        );

        if (rowsToProcess.length === 0) {
          cy.log('Nenhuma nota fiscal nova encontrada para processar');
          return;
        }

        cy.wrap(rowsToProcess).each((row) => {
          const valor = row.valor.replace('.', ',');
          cy.addDonation({
            dataDocumento: row.dataDocumento,
            documento: row.documento,
            valor: valor,
            dataRecebimento: row.dataRecebimento,
          }).then(() => {
            cy.task('appendProcessedNote', row.documento);
          });
        });
      });
    });
  });
});
