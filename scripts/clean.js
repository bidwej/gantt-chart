const fs = require('fs');
const path = require('path');

function rm(targetPath) {
  if (fs.existsSync(targetPath)) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`Deleted: ${targetPath}`);
    } catch (err) {
      console.error(`Failed to delete ${targetPath}: ${err.message}`);
    }
  }
}

const action = process.argv[2];

if (action === 'vis-docs') {
  rm(path.join(__dirname, '../node_modules/vis/docs'));
} else if (action === 'dist') {
  const packagesDir = path.join(__dirname, '../packages');
  if (fs.existsSync(packagesDir)) {
    const dirs = fs.readdirSync(packagesDir);
    for (const dir of dirs) {
      const p = path.join(packagesDir, dir);
      if (fs.statSync(p).isDirectory()) {
        rm(path.join(p, 'dist'));
        rm(path.join(p, 'stats.html'));
      }
    }
  }
} else if (action === 'junk') {
  const rootDir = path.join(__dirname, '..');
  const files = fs.readdirSync(rootDir);
  for (const file of files) {
    if (file.endsWith('-debug.log') || file.endsWith('-error.log') || file === 'stats.html') {
      rm(path.join(rootDir, file));
    }
  }
  const packagesDir = path.join(__dirname, '../packages');
  if (fs.existsSync(packagesDir)) {
    const dirs = fs.readdirSync(packagesDir);
    for (const dir of dirs) {
      const p = path.join(packagesDir, dir);
      if (fs.statSync(p).isDirectory()) {
        const pFiles = fs.readdirSync(p);
        for (const file of pFiles) {
          if (file.endsWith('-debug.log') || file.endsWith('-error.log') || file === 'stats.html') {
            rm(path.join(p, file));
          }
        }
      }
    }
  }
} else if (action === 'modules') {
  rm(path.join(__dirname, '../node_modules'));
  rm(path.join(__dirname, '../package-lock.json'));
  rm(path.join(__dirname, '../yarn.lock'));
  
  const rootDir = path.join(__dirname, '..');
  fs.readdirSync(rootDir).forEach(file => {
    if (file.endsWith('-debug.log') || file.endsWith('-error.log')) {
      rm(path.join(rootDir, file));
    }
  });

  const packagesDir = path.join(__dirname, '../packages');
  if (fs.existsSync(packagesDir)) {
    const dirs = fs.readdirSync(packagesDir);
    for (const dir of dirs) {
      const p = path.join(packagesDir, dir);
      if (fs.statSync(p).isDirectory()) {
        rm(path.join(p, 'node_modules'));
        rm(path.join(p, 'package-lock.json'));
        rm(path.join(p, 'yarn.lock'));
        fs.readdirSync(p).forEach(file => {
          if (file.endsWith('-debug.log') || file.endsWith('-error.log')) {
            rm(path.join(p, file));
          }
        });
      }
    }
  }
}
