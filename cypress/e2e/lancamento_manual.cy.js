describe('Doações em lote via CSV', () => {
  it('Importa lançamento manual', () => {
    cy.visit('https://siga.congregacao.org.br/CTB/CTB01002.aspx');

    cy.url({ timeout: 90000 }).should('include', '/CTB/CTB01002.aspx');
    cy.get('.blockMsg > div', { timeout: 90000 }).should('not.exist');

    cy.task('readProcessedNotes').then((processedNotes) => {
      cy.task('readCsvChunks', {
        filename: 'doacoes2.csv',
        processedNotes: processedNotes,
      }).then((rows) => {
        if (rows.length === 0) {
          cy.log('Nenhuma nota fiscal nova encontrada para processar');
          return;
        }

        cy.wrap(rows).each((row, index) => {
          cy.newManualEntry(row).then(() => {
            cy.task('appendProcessedNote', row);
          });
          cy.task(
            'sendTelegramMessage',
            'finalizado lote ' + index + ' de ' + rows.length
          );
        });
      });
    });
  });
});
