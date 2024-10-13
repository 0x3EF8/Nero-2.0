const fs = require('fs').promises;
const path = require('path');
const ProgressBar = require('progress');
const chalk = require('chalk');

async function loadModules(folders) {
  const allFiles = [];
  const moduleTypes = {};

  for (const [folderPath, moduleType] of Object.entries(folders)) {
    try {
      const files = (await fs.readdir(folderPath)).filter(
        (file) => path.extname(file) === '.js'
      );
      allFiles.push(...files.map(file => ({ file, folderPath, moduleType })));
    } catch (error) {
      console.error(chalk.red(`Error reading directory ${folderPath}:`), error);
    }
  }

  const bar = new ProgressBar(chalk.cyan(':bar') + ' :percent :etas', {
    total: allFiles.length,
    width: 40,
    complete: '█',
    incomplete: ' ',
    renderThrottle: 1,
  });

  const modules = {};
  const errors = [];

  for (const { file, folderPath, moduleType } of allFiles) {
    const moduleName = file.split('.')[0].toLowerCase();

    try {
      const module = require(path.join(folderPath, file));
      if (!modules[moduleType]) {
        modules[moduleType] = {};
      }
      modules[moduleType][moduleName] = module;
      moduleTypes[moduleName] = moduleType;
    } catch (error) {
      errors.push({ file, error: error.message });
      console.error(chalk.red(`Error loading module ${file}:`), error);
    }

    bar.tick();
  }

  if (bar.complete) {
    console.log(chalk.green('\n✅ Modules integration completed:'));
    for (const [moduleType, typeModules] of Object.entries(modules)) {
      const successCount = Object.keys(typeModules).length;
      const totalCount = allFiles.filter(f => f.moduleType === moduleType).length;
      console.log(chalk.green(`   ${moduleType}: ${successCount}/${totalCount}`));
    }
    
    if (errors.length > 0) {
      console.log(chalk.yellow('\n⚠️ Modules with errors:'));
      errors.forEach(({ file, error }) => {
        console.log(chalk.yellow(`   ${file}: ${error}`));
      });
    }
  }

  return { modules, moduleTypes, errors };
}

module.exports = { loadModules };