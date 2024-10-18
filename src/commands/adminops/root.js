const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

async function getUsername() {
  try {
    const { stdout } = await execPromise('whoami');
    return stdout.trim();
  } catch (error) {
    console.error('Error getting username:', error);
    return 'user';
  }
}

async function getFileCreationDates(files) {
  const creationDates = {};
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    const stats = fs.statSync(filePath);
    creationDates[file] = stats.birthtime.toISOString().slice(0, 10);
  }

  return creationDates;
}

async function adminops(event, api) {
  const cmdFolderPath = path.join(__dirname, '.');
  
  fs.readdir(cmdFolderPath, async (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    const commandFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === '.js'
    );

    const commandList = commandFiles.map((file) => path.parse(file).name);
    const creationDates = await getFileCreationDates(commandFiles);

    const perPage = 10;
    const totalPages = Math.ceil(commandList.length / perPage);
    const userMessage = event.body.toLowerCase().trim();
    let page = parseInt(userMessage.split(' ')[1]) || 1;
    let showAll = false;

    if (userMessage.includes('-all')) {
      showAll = true;
      page = 1;
    }

    const packageInfo = getPackageInfo();
    const commandName = path.basename(__filename, path.extname(__filename));
    const osType = os.type();
    const username = await getUsername();
    const hostname = os.hostname(); 

    if (userMessage.includes('-help')) {
      const helpMessage =
        `Usage: ${commandName} [-help]\n\n` +
        'Description:\n' +
        `  - ${commandName} -help: Displays detailed command usage.\n` +
        `  - ${commandName} -all: Lists all available commands.\n` +
        'Note: Use the command name followed by "-help" to retrieve specific usage instructions.';
      api.sendMessage(helpMessage, event.threadID);
      return;
    }

    if (showAll) {
      const output = [
        `${username}@${hostname}:~$ ${commandName} -all`,
        `Package: ${packageInfo.name} v${packageInfo.version} | OS: ${osType}`,
        'Available Admin Commands:',
        '-----------------------------------',
        ...commandList.map((cmd) => {
          const creationDate = creationDates[`${cmd}.js`];
          return `- ${cmd.charAt(0).toUpperCase() + cmd.slice(1)} (Created: ${creationDate})`;
        }),
        '-----------------------------------',
        `Total Commands: ${commandList.length}`,
        'Displaying all available commands.',
        '',
        `Instructions: To view usage for a specific command, type the command followed by "-help." For example, to access usage details for the "${commandName}" command, type "${commandName} -help."`,
      ];

      api.sendMessage(output.join('\n'), event.threadID);
    } else {
      page = Math.max(1, Math.min(page, totalPages));

      const startIndex = (page - 1) * perPage;
      const endIndex = Math.min(startIndex + perPage, commandList.length);

      const commandsToShow = commandList.slice(startIndex, endIndex);

      const output = [
        `${username}@${hostname}:~$ ${commandName}`,
        `Package: ${packageInfo.name} v${packageInfo.version} | OS: ${osType}`,
        'Available Commands:',
        '-----------------------------------',
        ...commandsToShow.map((cmd) => {
          const creationDate = creationDates[`${cmd}.js`];
          return `- ${cmd.charAt(0).toUpperCase() + cmd.slice(1)} (Created: ${creationDate})`;
        }),
        '-----------------------------------',
        `Page ${page}/${totalPages}`,
        `Total Commands: ${commandList.length}`,
        '',
        `Instructions: To view usage for a specific command, type the command followed by "-help." For example, to access usage details for the "${commandName}" command, type "${commandName} -help."`,
      ];

      api.sendMessage(output.join('\n'), event.threadID);
    }
  });
}

module.exports = adminops;
