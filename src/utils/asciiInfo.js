const os = require('os');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs').promises;
const path = require('path');

async function getPackageInfo() {
  const packagePath = path.join(__dirname, '..', '..', 'package.json');
  const packageData = await fs.readFile(packagePath, 'utf8');
  const { name, version } = JSON.parse(packageData);
  return `${name} ${version}`;
}

async function displayAsciiInfo() {
  try {
    const packageInfo = await getPackageInfo();

    return new Promise((resolve, reject) => {
      figlet.text(
        packageInfo,
        {
          font: 'ANSI Shadow',
          horizontalLayout: 'default',
          verticalLayout: 'default',
        },
        (err, data) => {
          if (err) {
            reject(new Error('Error rendering ASCII art.'));
            return;
          }

          const startTime = new Date().toLocaleString();
          const memoryUsage = process.memoryUsage();

          const asciiInfo = [
            chalk.cyan(data),
            chalk.blue('═'.repeat(60)),
            chalk.white('System Information:'),
            chalk.gray(`• Node.js: ${process.version}`),
            chalk.gray(`• Environment: ${process.env.NODE_ENV || 'development'}`),
            chalk.gray(`• CPU Cores: ${os.cpus().length}`),
            chalk.gray(`• Total Memory: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB`),
            chalk.gray(`• Free Memory: ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(2)} GB`),
            chalk.gray(`• OS: ${os.type()} ${os.release()}`),
            chalk.gray(`• Hostname: ${os.hostname()}`),
            chalk.blue('─'.repeat(60)),
            chalk.white('Runtime Details:'),
            chalk.gray(`• Start Time: ${startTime}`),
            chalk.gray(`• Process ID: ${process.pid}`),
            chalk.gray(`• Memory Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`),
            chalk.blue('─'.repeat(60)),
            ''
          ].join('\n');

          resolve(asciiInfo);
        }
      );
    });
  } catch (error) {
    throw new Error('Error reading package.json: ' + error.message);
  }
}

module.exports = { displayAsciiInfo };
