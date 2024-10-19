const fs = require('fs');
const path = require('path');
const os = require('os');

async function getPackageInfo() {
  try {
    const packageData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'));
    return {
      name: packageData.name,
      version: packageData.version,
    };
  } catch (error) {
    return null;
  }
}

async function getFirstName(event, api) {
  const senderId = event.senderID;
  const userInfo = await api.getUserInfo(senderId);
  return userInfo[senderId]?.firstName.replace(/\s+/g, '').toLowerCase() || 'user';
}

async function adminops(event, api) {
  const cmdFolderPath = path.join(__dirname, '.');

  fs.readdir(cmdFolderPath, async (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    const commandFiles = files.filter(file => path.extname(file).toLowerCase() === '.js');
    const commandList = commandFiles.map(file => path.parse(file).name);
    const packageInfo = await getPackageInfo();
    const commandName = path.basename(__filename, path.extname(__filename));
    const osType = os.type();
    const firstName = await getFirstName(event, api);

    const perPage = 10;
    const totalPages = Math.ceil(commandList.length / perPage);
    const userMessage = event.body.toLowerCase().trim();
    let page = parseInt(userMessage.split(' ')[1]) || 1;
    let showAll = userMessage.includes('-all');

    if (userMessage.includes('-help')) {
      const helpMessage = `Usage: ${commandName} [-help]\n\nDescription:\n  - ${commandName} -help: Displays detailed command usage.\n  - ${commandName} -all: Lists all available commands.\nNote: Use the command name followed by "-help" to retrieve specific usage instructions.`;
      api.sendMessage(helpMessage, event.threadID);
      return;
    }

    if (showAll) {
      const output = [
        `${firstName}:~$ ${commandName} -all`,
        `System: ${packageInfo.name} v${packageInfo.version} | OS: ${osType}`,
        'Available Admin Commands:',
        '-----------------------------------',
        ...commandList.map(cmd => `- ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`),
        '-----------------------------------',
        `Total Commands: ${commandList.length}`,
        'Displaying all available commands.',
        '',
        `Instructions: To view usage for a specific command, type the command followed by "-help." For example, to access usage details for the "${commandName}" command, type "${commandName} -help."`
      ];

      api.sendMessage(output.join('\n'), event.threadID);
    } else {
      page = Math.max(1, Math.min(page, totalPages));
      const startIndex = (page - 1) * perPage;
      const endIndex = Math.min(startIndex + perPage, commandList.length);
      const commandsToShow = commandList.slice(startIndex, endIndex);

      const output = [
        `${firstName}:~$ ${commandName}`,
        `System: ${packageInfo.name} v${packageInfo.version} | OS: ${osType}`,
        'Available Commands:',
        '-----------------------------------',
        ...commandsToShow.map(cmd => `- ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`),
        '-----------------------------------',
        `Page ${page}/${totalPages}`,
        `Total Commands: ${commandList.length}`,
        '',
        `Instructions: To view usage for a specific command, type the command followed by "-help." For example, to access usage details for the "${commandName}" command, type "${commandName} -help."`
      ];

      api.sendMessage(output.join('\n'), event.threadID);
    }
  });
}

module.exports = adminops;
