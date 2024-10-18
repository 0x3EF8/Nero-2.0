const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const COMMAND_TIMEOUT = 7000;
const packagePath = path.join(__dirname, '..', '..', 'package.json');

function getPackageInfo() {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageData.name,
      version: packageData.version,
    };
  } catch (error) {
    console.error('Error reading package.json:', error);
    return null;
  }
}

async function sendOutputInChunks(api, threadID, output) {
  const chunkSize = 4000;
  for (let i = 0; i < output.length; i += chunkSize) {
    const chunk = output.substring(i, i + chunkSize);
    await api.sendMessage(chunk, threadID);
  }
}

async function shellCommand(event, api) {
  try {
    const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
    const input = event.body.toLowerCase();
    if (input.includes('-help')) {
      const usage = `
Command: ${commandName}

Usage: ${commandName} [cmd]
Description: Allows executing any shell commands directly on the server.

Examples:
  ${commandName} ls -al
  ${commandName} ping google.com
  ${commandName} ip a
  ${commandName} git --version
`;
      api.sendMessage(usage, event.threadID, event.messageID);
      return;
    }

    const cmd = event.body.split(' ').slice(1).join(' ');

    const packageInfo = getPackageInfo();
    const osType = os.type(); 

    let formattedOutput = '';
    if (packageInfo) {
      formattedOutput += `
╭─${packageInfo.name}${packageInfo.version}@${osType} ~
╰─$ ${cmd}
`;
    }

    if (!cmd) {
      formattedOutput += 'Please provide a command to execute.';
      await sendOutputInChunks(api, event.threadID, formattedOutput);
      return;
    }

    try {
      const { stdout, stderr } = await execPromise(cmd, {
        timeout: COMMAND_TIMEOUT,
        shell: true,
      });
      const fullOutput = stdout || stderr || 'No output';
      formattedOutput += fullOutput ? fullOutput : 'No output';
      await sendOutputInChunks(api, event.threadID, formattedOutput);
    } catch (error) {
      const errorMessage = `Command failed. Error: ${error.message}`;
      formattedOutput += `\n${errorMessage}`;
      await sendOutputInChunks(api, event.threadID, formattedOutput);
    }
  } catch (err) {
    const errorMessage = `An error occurred: ${err.message}`;
    const packageInfo = getPackageInfo();
    const osType = os.type(); 

    let formattedOutput = '';
    if (packageInfo) {
      formattedOutput += `
╭─${packageInfo.name}${packageInfo.version}@${osType} ~
╰─$ 
`;
    }
    
    formattedOutput += errorMessage;
    await sendOutputInChunks(api, event.threadID, formattedOutput);
  }
}

module.exports = shellCommand;
