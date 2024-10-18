const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const COMMAND_TIMEOUT = 7000;

function isadmins(userId) {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const adminsList = config.admins || [];
    return adminsList.includes(userId);
  } catch (error) {
    return false;
  }
}

async function sendOutputInChunks(api, threadID, output) {
  const chunkSize = 4000;
  for (let i = 0; i < output.length; i += chunkSize) {
    const chunk = output.substring(i, i + chunkSize);
    await api.sendMessage(chunk, threadID);
  }
}

async function shell(event, api) {
  try {
    const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();

    if (!isadmins(event.senderID)) {
      api.sendMessage(
        '🚫 Access Denied. You lack the necessary permissions to use this command.',
        event.threadID
      );
      return;
    }

    const input = event.body.toLowerCase();
    if (input.includes('-help')) {
      const usage = `
Command: ${commandName}

Usage: ${commandName} [cmd]
Description: Allows admins to execute shell commands directly on the server.

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

    if (!cmd) {
      api.sendMessage(
        '⚠️ Please provide a command to execute.',
        event.threadID,
        event.messageID
      );
      return;
    }

    try {
      const { stdout, stderr } = await execPromise(cmd, {
        timeout: COMMAND_TIMEOUT,
      });
      const fullOutput = stdout || stderr || 'No output';
      await sendOutputInChunks(api, event.threadID, fullOutput);
    } catch (error) {
      const errorMessage = `Command failed. Error: ${error.message}`;
      api.sendMessage(errorMessage, event.threadID, event.messageID);
    }
  } catch (err) {
    api.sendMessage(
      `❗ An error occurred: ${err.message}`,
      event.threadID,
      event.messageID
    );
  }
}

module.exports = shell;