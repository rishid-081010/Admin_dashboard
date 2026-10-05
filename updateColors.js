const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-[#001a36]': 'bg-[#050B14]',
  'bg-[#001830]': 'bg-[#0B1221]',
  'bg-[#001e39]': 'bg-[#0B1221]',
  'bg-[#00284b]': 'bg-white/[0.06]',
  'hover:bg-[#003666]': 'hover:bg-white/[0.1]',
  'border-[#00284b]': 'border-white/[0.05]',
  'border-[#003d73]': 'border-white/[0.08]',
  'bg-[#001428]': 'bg-[#050B14]',
  'bg-[#003666]': 'bg-white/[0.1]'
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
        console.log('Updated ' + fullPath);
      }
    }
  }
}

walkDir('client/src');
