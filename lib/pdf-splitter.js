const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

/**
 * Extrai o número da nota fiscal do texto usando regex
 * @param {string} text - Texto extraído do PDF
 * @returns {string|null} - Número da nota fiscal (6 dígitos) ou null
 */
function extractInvoiceNumber(text) {
  let match = text.match(/Nº\s*(\d{6})/);
  if (match) {
    return match[1];
  }

  match = text.match(/Nº\.\s*(\d{3}\.\d{3}\.\d{3})/);
  if (match) {
    return match[1].replace(/\./g, '');
  }

  return null;
}

/**
 * Extrai informações de página (Folha X/Y) do texto
 * @param {string} text - Texto extraído do PDF
 * @returns {object} - {current: número da folha atual, total: total de folhas}
 */
function extractPageInfo(text) {
  const match = text.match(/Folha\s+(\d+)\/(\d+)/);
  if (match) {
    return {
      current: parseInt(match[1]),
      total: parseInt(match[2]),
    };
  }
  return { current: 1, total: 1 };
}

/**
 * Analisa um PDF e organiza páginas por número de nota fiscal
 * @param {Buffer} pdfBuffer - Buffer contendo dados do PDF
 * @returns {object} - Mapa {numeroNota: {pages: [índices], pageInfo: {current, total}}}
 */
async function analyzeAndGroupPages(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();

  const invoiceMap = {}; // {numeroNota: {pages: [0,1,2], pageInfo: {}}}

  // Para cada página, extrair texto e informações
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    try {
      // Usar pdf-parse para extrair texto de uma página específica
      const singlePageBuffer = await extractSinglePage(pdfBuffer, pageIndex);
      const data = await pdfParse(singlePageBuffer);
      const text = data.text;

      const invoiceNumber = extractInvoiceNumber(text);
      const pageInfo = extractPageInfo(text);

      if (!invoiceNumber) {
        console.warn(
          `Página ${pageIndex + 1}: Número de nota não encontrado. Pulando...`
        );
        continue;
      }

      if (!invoiceMap[invoiceNumber]) {
        invoiceMap[invoiceNumber] = {
          pages: [],
          pageInfo: pageInfo,
          pageInfoList: [], // lista de pageInfo para cada página
        };
      }

      invoiceMap[invoiceNumber].pages.push(pageIndex);
      invoiceMap[invoiceNumber].pageInfoList.push(pageInfo);
    } catch (error) {
      console.warn(
        `Erro ao processar página ${pageIndex + 1}: ${error.message}`
      );
    }
  }

  return invoiceMap;
}

/**
 * Extrai uma única página de um PDF e retorna como buffer
 * @param {Buffer} pdfBuffer - Buffer do PDF original
 * @param {number} pageIndex - Índice da página (0-based)
 * @returns {Buffer} - Buffer contendo apenas a página especificada
 */
async function extractSinglePage(pdfBuffer, pageIndex) {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const newDoc = await PDFDocument.create();

  const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
  newDoc.addPage(copiedPage);

  return await newDoc.save();
}

/**
 * Cria um novo PDF com as páginas especificadas
 * @param {Buffer} pdfBuffer - Buffer do PDF original
 * @param {number[]} pageIndices - Índices das páginas a incluir
 * @returns {Buffer} - Buffer do novo PDF
 */
async function createPdfWithPages(pdfBuffer, pageIndices) {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const newDoc = await PDFDocument.create();

  for (const pageIndex of pageIndices) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
    newDoc.addPage(copiedPage);
  }

  return await newDoc.save();
}

/**
 * Quebra um PDF em PDFs individuais por número de nota fiscal
 * @param {string} inputPath - Caminho do arquivo PDF de entrada
 * @param {string} outputDir - Diretório de saída para PDFs extraídos
 * @returns {object} - {success: boolean, processedInvoices: number, invoices: []}
 */
async function splitPdfByInvoiceNumber(inputPath, outputDir) {
  try {
    // Verificar se arquivo existe
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Arquivo não encontrado: ${inputPath}`);
    }

    // Criar diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Ler arquivo PDF
    const pdfBuffer = fs.readFileSync(inputPath);

    console.log(`\n📄 Processando: ${path.basename(inputPath)}`);
    console.log(`📍 Saída: ${outputDir}`);

    // Analisar e agrupar páginas
    const invoiceMap = await analyzeAndGroupPages(pdfBuffer);

    const processedInvoices = [];
    const invoiceNumbers = Object.keys(invoiceMap).sort();

    console.log(`✅ Encontradas ${invoiceNumbers.length} notas fiscais\n`);

    // Para cada nota fiscal, criar arquivo PDF
    for (const invoiceNumber of invoiceNumbers) {
      const invoiceData = invoiceMap[invoiceNumber];
      const pages = invoiceData.pages;
      const pageInfoList = invoiceData.pageInfoList;

      // Determinar sufixo de arquivo
      let filename;
      if (pages.length === 1) {
        // Única página
        filename = `notafiscal_${invoiceNumber}.pdf`;
      } else {
        // Múltiplas páginas - usar número da folha atual
        const currentPage = pageInfoList[0].current;
        filename = `notafiscal_${invoiceNumber}.pdf`;
      }

      // Criar PDF com as páginas desta nota
      const newPdfBuffer = await createPdfWithPages(pdfBuffer, pages);

      // Salvar arquivo
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, newPdfBuffer);

      console.log(
        `  ✓ Nota ${invoiceNumber}: ${filename} (${pages.length} página${pages.length > 1 ? 's' : ''})`
      );

      processedInvoices.push({
        invoiceNumber,
        filename,
        pages: pages.length,
        outputPath,
      });
    }

    return {
      success: true,
      processedInvoices: processedInvoices.length,
      invoices: processedInvoices,
    };
  } catch (error) {
    console.error(`❌ Erro ao processar ${inputPath}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      processedInvoices: 0,
      invoices: [],
    };
  }
}

module.exports = {
  splitPdfByInvoiceNumber,
  extractInvoiceNumber,
  extractPageInfo,
};
