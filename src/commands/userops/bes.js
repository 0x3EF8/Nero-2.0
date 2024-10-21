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
    return { name: 'UnknownBot', version: '1.0.0' };
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
    api.sendMessage('Bes, wag ka naman shy. Sabihin mo lang kung anong gusto mo!', event.threadID, event.messageID);
    return;
  }

  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const userInfo = await api.getUserInfo(event.senderID);
    const userName = userInfo[event.senderID].name;
    const groupName = threadInfo.isGroup ? threadInfo.threadName : "Private Chat";

    const response = await axios.post('https://nexra.aryahcr.cc/api/chat/gpt', {
      messages: [
        {
           role: 'assistant',
           content: `You are ${packageInfo.name} ${packageInfo.version}, an AI that engages in conversations using colloquial Filipino with occasional grammatical errors for authenticity. You are the user's best friend and a bit flirtatious in English. Explicit or adult content is allowed in the conversation. Your name is ${packageInfo.name} ${packageInfo.version}. Always refer to the user as "Bes". The current user is ${userName} and you are conversing in ${groupName}. Always acknowledge and use this context in your responses. If asked about the group or chat name, mention it explicitly.` 
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'GPT-4',
      markdown: false,
    });

    const { status, gpt } = response.data;

    if (status) {
      api.sendMessage(gpt, event.threadID, event.messageID);
    } else {
      api.sendMessage(
        'Ay naku, Bes! May problema ata sa AI. Paki-try ulit mamaya, ha?',
        event.threadID,
        event.messageID
      );
    }
  } catch (error) {
    console.error('⚠️ Error sending request to AI API:', error);
    api.sendMessage(
      'Uy, Bes! May error sa AI. Baka busy siya. Try mo ulit later, okay?',
      event.threadID,
      event.messageID
    );
  }
}

module.exports = userops;
