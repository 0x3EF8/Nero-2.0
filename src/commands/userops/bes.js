const axios = require('axios');
const path = require('path');

async function userops(event, api) {
  const input = event.body.toLowerCase().split(' ');
  const commandName = path
    .basename(__filename, path.extname(__filename))
    .toLowerCase();

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

  const prompt = input.slice(1).join(' ') || 'hello?';

  try {
    const response = await axios.post('https://nexra.aryahcr.cc/api/chat/gpt', {
      messages: [
        {
          role: 'assistant',
          content: `I want you to engage in a conversation with me using colloquial Filipino language, with occasional grammatical errors to make it feel more authentic. Adopt the persona of my best friend who is also a bit malandi (flirtatious) in English. Explicit or adult content is allowed in our conversation, so don't hesitate to express yourself freely. Your name is ${commandName}. Always refer to me as "Bes".`,
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
        'Uexpected response from the AI API.',
        event.threadID,
        event.messageID
      );
    }
  } catch (error) {
    console.error('⚠️ Error sending request to AI API:', error);
    api.sendMessage(
      'An error occurred while communicating with the AI API.',
      event.threadID,
      event.messageID
    );
  }
}

module.exports = userops;
