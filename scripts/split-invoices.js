#!/usr/bin/env node

/**
 * Script CLI para quebrar PDFs agrupados em notas fiscais individuais
 * Uso: npm run split-invoices
 * 
 * Lê todos os PDFs da pasta ./notas
 * Salva notas extraídas em ./notas-extraidas/{nome-do-pdf}/
 */

const fs = require('fs');
const path = require('path');
const { splitPdfByInvoiceNumber } = require('../lib/pdf-splitter');

// Configuração de caminhos
const INPUT_DIR = path.join(__dirname, '..', 'notas');
const OUTPUT_BASE_DIR = path.join(__dirname, '..', 'notas-extraidas');

/**
 * Valida se o diretório de entrada existe
 */
function validateInputDirectory() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Diretório de entrada não encontrado: ${INPUT_DIR}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'));
  
  if (files.length === 0) {
    console.error(`⚠️  Nenhum arquivo PDF encontrado em: ${INPUT_DIR}`);
    process.exit(1);
  }
  
  return files;
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 Iniciando divisão de notas fiscais em PDF');
  console.log('═'.repeat(60));
  
  // Validar entrada
  const pdfFiles = validateInputDirectory();
  console.log(`\n📂 Entrada: ${INPUT_DIR}`);
  console.log(`📂 Saída: ${OUTPUT_BASE_DIR}`);
  console.log(`\n📋 Encontrados ${pdfFiles.length} arquivo(s) PDF\n`);
  
  // Criar diretório base de saída
  if (!fs.existsSync(OUTPUT_BASE_DIR)) {
    fs.mkdirSync(OUTPUT_BASE_DIR, { recursive: true });
  }
  
  let totalProcessed = 0;
  let totalInvoices = 0;
  const results = [];
  
  // Processar cada PDF
  for (const file of pdfFiles) {
    const inputPath = path.join(INPUT_DIR, file);
    const fileNameWithoutExt = path.parse(file).name;
    const outputDir = path.join(OUTPUT_BASE_DIR, fileNameWithoutExt);
    
    try {
      const result = await splitPdfByInvoiceNumber(inputPath, outputDir);
      
      if (result.success) {
        results.push({
          file,
          status: 'success',
          invoiceCount: result.processedInvoices
        });
        totalProcessed++;
        totalInvoices += result.processedInvoices;
      } else {
        results.push({
          file,
          status: 'error',
          error: result.error
        });
      }
      
    } catch (error) {
      console.error(`\n❌ Erro inesperado ao processar ${file}:`);
      console.error(error);
      results.push({
        file,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Resumo final
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMO DA EXECUÇÃO');
  console.log('═'.repeat(60));
  console.log(`✅ Arquivos processados: ${totalProcessed}/${pdfFiles.length}`);
  console.log(`📄 Total de notas extraídas: ${totalInvoices}`);
  
  // Detalhes por arquivo
  console.log('\n📋 Detalhes:');
  for (const result of results) {
    if (result.status === 'success') {
      console.log(`  ✓ ${result.file}: ${result.invoiceCount} nota(s)`);
    } else {
      console.log(`  ✗ ${result.file}: ${result.error}`);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Verificar erros
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} erro(s) encontrado(s)`);
    process.exit(1);
  } else {
    console.log('\n✨ Processo concluído com sucesso!');
    process.exit(0);
  }
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
