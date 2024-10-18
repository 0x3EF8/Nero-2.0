const path = require('path');

async function unsend(event, api) {
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  
  if (event.body.includes('-help')) {
  const usage = 
    `Usage: ${commandName}

Description: ${commandName} the message that is being replied to.

Note: This command does not require any arguments.`;

  api.sendMessage(usage, event.threadID);
  return Promise.resolve();
}

  if (event.type === 'message_reply') {
    const messageReplyId = event.messageReply.messageID;
    api.unsendMessage(messageReplyId);
  }
}

module.exports = unsend;