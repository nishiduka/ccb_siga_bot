const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

/**
 * Extrai e exibe todo o texto de um PDF
 * @param {string} caminhoArquivo - Caminho do arquivo PDF
 */
async function exibirTextoPDF(caminhoArquivo) {
  try {
    // Verificar se arquivo existe
    if (!fs.existsSync(caminhoArquivo)) {
      console.error(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
      return;
    }

    // Ler o arquivo PDF
    const buffer = fs.readFileSync(caminhoArquivo);

    // Parsear o PDF
    const dados = await pdfParse(buffer);

    // Exibir informações do PDF
    console.log('\n📄 ========== INFORMAÇÕES DO PDF ==========');
    console.log(`📑 Número de páginas: ${dados.numpages}`);
    console.log(`✍️  Versão PDF: ${dados.version}`);
    console.log('==========================================\n');

    // Exibir texto de cada página
    console.log('📝 TEXTO EXTRAÍDO:\n');
    console.log(dados.text);

    // Exibir informações adicionais por página
    if (dados.pages && dados.pages.length > 0) {
      console.log('\n\n📄 ========== DETALHES POR PÁGINA ==========');
      dados.pages.forEach((pagina, indice) => {
        console.log(`\n--- Página ${indice + 1} ---`);
        console.log(pagina.text);
      });
      console.log('==========================================\n');
    }

    return dados;
  } catch (erro) {
    console.error('❌ Erro ao processar PDF:', erro.message);
  }
}

/**
 * Extrai texto de um PDF e salva em arquivo de texto
 * @param {string} caminhoArquivo - Caminho do arquivo PDF
 * @param {string} arquivoSaida - Caminho do arquivo de saída (opcional)
 */
async function salvarTextoExtraidoEmArquivo(caminhoArquivo, arquivoSaida) {
  try {
    if (!fs.existsSync(caminhoArquivo)) {
      console.error(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
      return;
    }

    const buffer = fs.readFileSync(caminhoArquivo);
    const dados = await pdfParse(buffer);

    // Nome do arquivo de saída (padrão)
    const saida =
      arquivoSaida ||
      path.join(
        path.dirname(caminhoArquivo),
        `${path.basename(caminhoArquivo, '.pdf')}_texto.txt`
      );

    // Salvar texto extraído
    fs.writeFileSync(saida, dados.text, 'utf-8');
    console.log(`✅ Texto salvo em: ${saida}`);

    return saida;
  } catch (erro) {
    console.error('❌ Erro ao salvar texto:', erro.message);
  }
}

/**
 * Extrai metadados do PDF
 * @param {string} caminhoArquivo - Caminho do arquivo PDF
 */
async function obterMetadadosPDF(caminhoArquivo) {
  try {
    if (!fs.existsSync(caminhoArquivo)) {
      console.error(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
      return;
    }

    const buffer = fs.readFileSync(caminhoArquivo);
    const dados = await pdfParse(buffer);

    const metadados = {
      numPaginas: dados.numpages,
      versao: dados.version,
      titulo: dados.info?.Title || 'Não disponível',
      autor: dados.info?.Author || 'Não disponível',
      assunto: dados.info?.Subject || 'Não disponível',
      criador: dados.info?.Creator || 'Não disponível',
      dataCriacao: dados.info?.CreationDate || 'Não disponível',
    };

    console.log('\n📊 ========== METADADOS DO PDF ==========');
    Object.entries(metadados).forEach(([chave, valor]) => {
      console.log(`${chave}: ${valor}`);
    });
    console.log('==========================================\n');

    return metadados;
  } catch (erro) {
    console.error('❌ Erro ao obter metadados:', erro.message);
  }
}

// ========== EXEMPLO DE USO ==========

// Descomente a linha abaixo e substitua pelo caminho do seu PDF
// exibirTextoPDF('./seu-arquivo.pdf');

// Ou use as outras funções:
// salvarTextoExtraidoEmArquivo('./seu-arquivo.pdf');
// obterMetadadosPDF('./seu-arquivo.pdf');

// module.exports = {
//   exibirTextoPDF,
//   salvarTextoExtraidoEmArquivo,
//   obterMetadadosPDF,
// };

exibirTextoPDF('C:\\Users\\aaaaa\\Downloads\\page-1.pdf');
