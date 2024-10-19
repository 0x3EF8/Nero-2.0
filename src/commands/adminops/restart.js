const path = require('path');
const fs = require('fs');

const packagePath = path.join(__dirname, '..', '..', '..', 'package.json');

function getPackageInfo() {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageData.name,
      version: packageData.version,
    };
  } catch (error) {
    return null;
  }
}

function adminops(event, api) {
  const input = event.body.toLowerCase().split(' ');
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();

  if (input.includes('-help')) {
    const usage = `
${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command Help

Command Usage:

1. Basic Command: 
   - Command: ${commandName}
   - Description: Restarts the system and logs the restart time.
   
2. Help Command:
   - Command: ${commandName} -help
   - Description: Displays help information about the command.
    `;
    api.sendMessage(usage, event.threadID);
    return;
  }

  if (packageInfo) {
    const restartTime = new Date().toISOString();
    const logMessage = `${packageInfo.name} ${packageInfo.version} was restarted at: ${restartTime}\n`;

    api.sendMessage(
      `🔄 Restarting ${packageInfo.name} ${packageInfo.version} in 3 seconds... Please wait.`,
      event.threadID,
      event.messageID
    );

    setTimeout(() => {
      process.exit(0); 
    }, 3000);
  }
}

module.exports = adminops;
