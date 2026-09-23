const fs = require('fs');
const path = require('path');

/**
 * Converte JSON para CSV
 * @param {string} jsonFilePath - Caminho do arquivo JSON
 * @param {string} csvFilePath - Caminho para salvar o arquivo CSV
 * @param {string[]} [headers] - Headers customizados (opcional)
 */
function jsonToCsv(jsonFilePath, csvFilePath, headers = null) {
  try {
    // Ler arquivo JSON
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    
    // Garantir que temos um array
    const data = Array.isArray(jsonData) ? jsonData : [jsonData];
    
    if (data.length === 0) {
      console.error('Arquivo JSON vazio');
      return;
    }
    
    // Obter headers do primeiro objeto ou usar os fornecidos
    const cols = headers || Object.keys(data[0]);
    
    // Criar CSV
    const csv = [
      // Headers
      cols.map(col => `"${col}"`).join(','),
      // Dados
      ...data.map(row =>
        cols.map(col => {
          const value = row[col] ?? '';
          const strValue = String(value);
          // Escapar aspas e envolver em aspas se necessário
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return `"${strValue}"`;
        }).join(',')
      )
    ].join('\n');
    
    // Salvar arquivo CSV
    fs.writeFileSync(csvFilePath, csv, 'utf-8');
    console.log(`✓ CSV gerado com sucesso: ${csvFilePath}`);
    console.log(`  Linhas: ${data.length}`);
    console.log(`  Colunas: ${cols.join(', ')}`);
    
  } catch (error) {
    console.error('Erro ao converter:', error.message);
  }
}

// Uso via CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Uso: node json-to-csv.js <arquivo.json> <arquivo.csv> [col1,col2,col3]');
    console.log('');
    console.log('Exemplos:');
    console.log('  node json-to-csv.js doacoes.json doacoes.csv');
    console.log('  node json-to-csv.js data.json output.csv "id,nome,valor"');
    process.exit(1);
  }
  
  const [jsonFile, csvFile, headerString] = args;
  const headers = headerString ? headerString.split(',').map(h => h.trim()) : null;
  
  jsonToCsv(jsonFile, csvFile, headers);
}

module.exports = jsonToCsv;
