// underdevelopment dhaskfsgiasgfsafakshdlasdsklasndklashgasihdkashduas

const chalk = require('chalk');

function handleError(message, error) {
  console.error(chalk.red(`⚠️ ${message}`), error);
}

module.exports = { handleError };
