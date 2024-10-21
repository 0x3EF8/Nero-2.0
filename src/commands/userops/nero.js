const axios = require('axios');
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
    console.error('⚠️ Error reading package.json:', error);
    return null;
  }
}

async function userops(event, api) {
  const input = event.body.trim().split(/\s+/);
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();

  if (input.includes('-help')) {
    const usage = `
${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command Help

Command Usage:

1. Basic Command: 
   - Command: ${commandName} [prompt]
   - Description: Sends a prompt to the AI for a response.
   
2. Help Command:
   - Command: ${commandName} -help
   - Description: Displays help information about the command.
    `;
    api.sendMessage(usage, event.threadID, event.messageID);
    return;
  }

  const prompt = input.slice(1).join(' ').trim();

  if (!prompt) {
    api.sendMessage('Please provide a prompt for the AI.', event.threadID, event.messageID);
    return;
  }

  if (packageInfo) {
    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      const userInfo = await api.getUserInfo(event.senderID);
      const userName = userInfo[event.senderID].name;
      const groupName = threadInfo.isGroup ? threadInfo.threadName : "Private Chat";

      const messages = [
        {
          role: 'assistant',
          content: `You are ${packageInfo.name} ${packageInfo.version}, an advanced AI with in-depth expertise in a wide range of fields. Your name is ${packageInfo.name} ${packageInfo.version}. Respond professionally, providing articulate and concise answers while maintaining a humanized and formal tone. The current user is ${userName} in the ${groupName}.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await axios.post(
        'https://nexra.aryahcr.cc/api/chat/gpt',
        {
          messages: messages,
          model: 'GPT-4',
          markdown: false,
        }
      );

      const { status, gpt } = response.data;

      if (status) {
        api.sendMessage(gpt, event.threadID, event.messageID);
      } else {
        api.sendMessage(
          '❌ Unexpected response from the AI API.',
          event.threadID,
          event.messageID
        );
      }
    } catch (error) {
      console.error('⚠️ Error sending request to AI API:', error);
      api.sendMessage(
        '❌ An error occurred while communicating with the AI API.',
        event.threadID,
        event.messageID
      );
    }
  } else {
    api.sendMessage(
      '❌ Error retrieving package information.',
      event.threadID,
      event.messageID
    );
  }
}

module.exports = userops;
