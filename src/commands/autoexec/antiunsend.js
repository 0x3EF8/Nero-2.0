const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const https = require('https');

const configPath = path.join(__dirname, '..', 'config', 'settings.json');
let config;

let messagesData = {};

const tempDir = path.join(__dirname, '..', 'data', 'temp');
const messagesJsonPath = path.join(tempDir, 'messages.json');

async function loadConfig() {
  try {
    const configData = await fsPromises.readFile(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    console.error('Error loading config:', error);
    config = { nero: { antiUnsend: false } };
  }
}

async function loadMessagesData() {
  try {
    await fsPromises.mkdir(tempDir, { recursive: true });
    const data = await fsPromises.readFile(messagesJsonPath, 'utf8');
    messagesData = JSON.parse(data);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error loading messages data:', error);
    }
    messagesData = {};
  }
}

async function saveMessagesData() {
  try {
    await fsPromises.mkdir(tempDir, { recursive: true });
    await fsPromises.writeFile(messagesJsonPath, JSON.stringify(messagesData, null, 2));
  } catch (error) {
    console.error('Error saving messages data:', error);
  }
}

async function handleUnsend(api, event) {
  await loadConfig();
  await loadMessagesData();

  async function downloadAttachment(attachment, index) {
    if (attachment.type === 'share') {
      return null;
    }

    const attachmentType = attachment.type;
    const attachmentUrl = attachment.url;
    const fileExtension = attachmentType === 'photo' ? 'jpg' : 
                          attachmentType === 'animated_image' ? 'gif' : 
                          attachmentType === 'video' ? 'mp4' : 
                          attachmentType === 'audio' ? 'mp3' : 'file';
    const fileName = path.join(tempDir, `attachment_${Date.now()}_${index}.${fileExtension}`);
    
    return new Promise((resolve, reject) => {
      https.get(attachmentUrl, (response) => {
        const fileStream = fs.createWriteStream(fileName);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`${attachmentType} downloaded successfully`);
          resolve(fileName);
        });
        fileStream.on('error', (err) => {
          console.error(`Error writing ${attachmentType} to file:`, err);
          reject(err);
        });
      }).on('error', (err) => {
        console.error(`Error downloading ${attachmentType}:`, err);
        reject(err);
      });
    });
  }

  async function handleMessageUnsend() {
    if (!messagesData[event.messageID]) {
      console.log('Message not found in cache');
      return;
    }

    try {
      const userInfo = await api.getUserInfo(event.senderID);
      const userName = userInfo[event.senderID].name;

      let message = {
        body: `User: @${userName} unsent a message\n\n`,
        mentions: [{ tag: `@${userName}`, id: event.senderID, fromIndex: 6 }],
        attachment: []
      };

      const unsentMessage = messagesData[event.messageID];
      const attachments = unsentMessage.attachments || [];

      if (unsentMessage.body) {
        message.body += `${unsentMessage.body}\n`;
      }

      if (attachments.length > 0) {
        const attachmentTypes = attachments.map(att => att.type);
        const uniqueTypes = [...new Set(attachmentTypes)];

        let attachmentMessage = '\n';
        if (uniqueTypes.length === 1) {
          const type = uniqueTypes[0];
          if (type === 'photo') {
            attachmentMessage += attachmentTypes.length > 1 ? 'Photos' : 'A photo';
          } else if (type === 'video') {
            attachmentMessage += attachmentTypes.length > 1 ? 'Videos' : 'A video';
          } else if (type === 'audio') {
            attachmentMessage += attachmentTypes.length > 1 ? 'Audio files' : 'An audio file';
          } else if (type === 'file') {
            attachmentMessage += attachmentTypes.length > 1 ? 'Files' : 'A file';
          }
        } else {
          attachmentMessage += 'Multiple attachments';
        }
        
        message.body += attachmentMessage;

        for (let i = 0; i < attachments.length; i++) {
          try {
            const fileName = await downloadAttachment(attachments[i], i);
            if (fileName) {
              message.attachment.push(fs.createReadStream(fileName));
            }
          } catch (err) {
            console.error(`Error processing attachment ${i + 1}:`, err);
          }
        }
      }

      if (config.nero.antiUnsend) {
        try {
          await api.sendMessage(message, event.threadID);
          console.log('Unsend alert sent to the original thread');
        } catch (err) {
          console.error('Error sending message to thread:', err);
        }
      }

      for (const attachment of message.attachment) {
        try {
          await fsPromises.unlink(attachment.path);
        } catch (err) {
          console.error('Error deleting temporary file:', err);
        }
      }
    } catch (err) {
      console.error('Error handling unsend event:', err);
    }
  }

  if (event.type === 'message' || event.type === 'message_reply') {
    messagesData[event.messageID] = event;
    await saveMessagesData();
  } else if (event.type === 'message_unsend') {
    await handleMessageUnsend();
  }
}

loadConfig();
loadMessagesData();

module.exports = handleUnsend;
