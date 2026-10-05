const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-white/[0.06]/95': 'bg-black/60',
  'bg-white/[0.06]/[0.03]': 'bg-white/[0.02]',
  'bg-white/[0.06]/5': 'bg-white/[0.02]',
  'hover:bg-white/[0.06]/25': 'hover:bg-white/[0.04]',
  'border-white/[0.08]/50': 'border-white/[0.04]'
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [find, replace] of Object.entries(replacements)) {
        if (content.includes(find)) {
          content = content.split(find).join(replace);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

walkDir('client/src');
