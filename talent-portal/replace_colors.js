const fs = require('fs');
const path = require('path');

const replacements = {
  // Indigo -> Zuari Blue
  'indigo-50': 'zuari-blue/10',
  'indigo-100': 'zuari-blue/20',
  'indigo-200': 'zuari-blue/30',
  'indigo-500': 'zuari-blue/80',
  'indigo-600': 'zuari-blue',
  'indigo-700': 'zuari-blue/90',
  'indigo-800': 'zuari-blue/90',

  // Emerald -> Zuari Green
  'emerald-50': 'zuari-green/10',
  'emerald-100': 'zuari-green/15',
  'emerald-200': 'zuari-green/30',
  'emerald-400': 'zuari-green/80',
  'emerald-500': 'zuari-green',
  'emerald-600': 'zuari-green',
  'emerald-700': 'zuari-green/90',
  'emerald-800': 'zuari-green/90',
  'emerald-900': 'zuari-green/90',

  // Rose -> Zuari Red
  'rose-50': 'zuari-red/10',
  'rose-100': 'zuari-red/15',
  'rose-200': 'zuari-red/30',
  'rose-500': 'zuari-red',
  'rose-600': 'zuari-red',
  'rose-700': 'zuari-red/90',
  'rose-800': 'zuari-red/90',
  'rose-900': 'zuari-red/90',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetExtensions = ['.tsx', '.ts', '.css'];

walkDir('./src', function(filePath) {
  if (targetExtensions.includes(path.extname(filePath))) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    for (const [key, value] of Object.entries(replacements)) {
      // Create a regex to match the class name boundaries.
      // We look for text-, bg-, border-, etc. + key
      const regex = new RegExp(`(?<=\\b(?:text-|bg-|border-|hover:bg-|hover:text-))${key}\\b`, 'g');
      newContent = newContent.replace(regex, value);
    }

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
