const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i];
    });
    return obj;
  });
}

function readCsvFromFixtures(filename) {
  const filePath = path.resolve(__dirname, 'cypress', 'fixtures', filename);
  return parseCSV(filePath);
}

function chunkItems(items, size = 10) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function loadProcessedNotes(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProcessedNotes(filePath, notes) {
  const normalized = Array.from(
    new Set(
      notes.map((note) => String(note).trim()).filter((note) => note.length > 0)
    )
  );
  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}

function sendTelegram(message) {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return Promise.resolve(false);
  }

  const payload = JSON.stringify({
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let response = '';
      res.on('data', (chunk) => {
        response += chunk;
      });
      res.on('end', () => resolve(response));
    });

    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

module.exports = {
  allowCypressEnv: false,

  e2e: {
    testIsolation: false,
    setupNodeEvents(on, config) {
      on('task', {
        readCsv(filename) {
          return readCsvFromFixtures(filename);
        },
        readCsvChunks({ filename, processedNotes }) {
          const processedSet = new Set(
            processedNotes.map((note) => String(note).trim())
          );
          const rows = readCsvFromFixtures(filename).filter(
            (row) => !processedSet.has(row.documento)
          );
          return chunkItems(rows, 10);
        },
        fileExists(relPath) {
          const filePath = path.resolve(__dirname, relPath);
          return fs.existsSync(filePath);
        },
        readProcessedNotes() {
          const processedNotesPath = path.resolve(
            __dirname,
            'cypress',
            'fixtures',
            'processed-notas.json'
          );
          return loadProcessedNotes(processedNotesPath);
        },
        appendProcessedNote(documento) {
          const processedNotesPath = path.resolve(
            __dirname,
            'cypress',
            'fixtures',
            'processed-notas.json'
          );
          const notes = loadProcessedNotes(processedNotesPath);
          const items = Array.isArray(documento) ? documento : [documento];
          const documentos = items
            .map((item) => {
              const value =
                item && typeof item === 'object' ? item.documento : item;
              return String(value || '').trim();
            })
            .filter((value) => value.length > 0);

          if (documentos.length === 0) {
            return notes;
          }

          let changed = false;
          documentos.forEach((normalizedDocumento) => {
            if (!notes.includes(normalizedDocumento)) {
              notes.push(normalizedDocumento);
              changed = true;
            }
          });

          if (changed) {
            saveProcessedNotes(processedNotesPath, notes);
          }
          return notes;
        },
        sendTelegramMessage(message) {
          return sendTelegram(message);
        },
      });
    },
    video: false,
    screenshotOnRunFailure: false,
    numTestsKeptInMemory: 0,
    chromeWebSecurity: false,
  },
};
