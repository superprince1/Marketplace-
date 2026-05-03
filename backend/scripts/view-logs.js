const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logDir = path.join(__dirname, '../logs');
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('Usage: node view-logs.js <search term>');
  process.exit(1);
}

const files = fs.readdirSync(logDir).filter(f => f.includes('.log'));

files.forEach(file => {
  const filePath = path.join(logDir, file);
  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  let lineNumber = 0;
  rl.on('line', (line) => {
    lineNumber++;
    if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
      console.log(`\n[${file}:${lineNumber}] ${line}`);
    }
  });
});