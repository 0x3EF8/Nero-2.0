const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const https = require('https');

const configPath = path.join(__dirname, '..', '..', '..', 'config', 'settings.json');
const tempDir = path.join(__dirname,   '..', '..', '..', 'data', 'temp');
const messagesJsonPath = path.join(tempDir, 'messages.json');

let config;
let messagesData = {};

async function loadConfig() {
  try {
    const configData = await fsPromises.readFile(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    // console.log('Error loading config:', error);
    config = { nero: { antiUnsend: false } };
  }
}

async function loadMessagesData() {
  try {
    await fsPromises.mkdir(tempDir, { recursive: true });
    const data = await fsPromises.readFile(messagesJsonPath, 'utf8');
    messagesData = JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // console.log('messages.json not found. Creating new file...');
      messagesData = {};
      await saveMessagesData();
    } else {
      // console.log('Error loading messages data:', error);
      messagesData = {};
    }
  }
}

async function saveMessagesData() {
  try {
    await fsPromises.writeFile(
      messagesJsonPath,
      JSON.stringify(messagesData, null, 2)
    );
  } catch (error) {
    // console.log('Error saving messages data:', error);
  }
}

async function autoexec(api, event) {
  await loadConfig();
  await loadMessagesData();

  async function downloadAttachment(attachment, index) {
    if (attachment.type === 'share') return null;

    const fileExtension =
      {
        photo: 'jpg',
        animated_image: 'gif',
        video: 'mp4',
        audio: 'mp3',
      }[attachment.type] || 'file';

    const fileName = path.join(
      tempDir,
      `attachment_${Date.now()}_${index}.${fileExtension}`
    );

    return new Promise((resolve, reject) => {
      https
        .get(attachment.url, (response) => {
          const fileStream = fs.createWriteStream(fileName);
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            // console.log(`${attachment.type} downloaded successfully`);
            resolve(fileName);
          });
          fileStream.on('error', reject);
        })
        .on('error', reject);
    });
  }

  async function handleMessageUnsend() {
    if (!messagesData[event.messageID]) return;

    const unsentMessage = messagesData[event.messageID];
    const userInfo = await api.getUserInfo(event.senderID);
    const userName = userInfo[event.senderID].name;

    let message = {
      body: `User: @${userName} unsent a message\n\n`,
      mentions: [{ tag: `@${userName}`, id: event.senderID, fromIndex: 6 }],
      attachment: [],
    };

    if (unsentMessage.body) message.body += `${unsentMessage.body}\n`;

    if (unsentMessage.attachments?.length) {
      const attachments = unsentMessage.attachments;
      message.body += attachments.length > 1 ? '\nMultiple attachments\n' : '';

      for (let i = 0; i < attachments.length; i++) {
        try {
          const fileName = await downloadAttachment(attachments[i], i);
          if (fileName) message.attachment.push(fs.createReadStream(fileName));
        } catch (err) {
          // console.log(`Error processing attachment ${i + 1}:`, err);
        }
      }
    }

    if (config.nero.antiUnsend) {
      await api.sendMessage(message, event.threadID);
    }

    for (const attachment of message.attachment) {
      await fsPromises.unlink(attachment.path).catch(console.error);
    }
  }

  if (event.type === 'message' || event.type === 'message_reply') {
    messagesData[event.messageID] = event;
    await saveMessagesData();
  } else if (event.type === 'message_unsend') {
    await handleMessageUnsend();
  }
}

function scheduleTempDirCleanup() {
  setInterval(
    async () => {
      try {
        const files = await fsPromises.readdir(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          await fsPromises.unlink(filePath).catch(console.error);
        }
        // console.log('Temp directory cleaned.');
      } catch (error) {
        // console.log('Error cleaning temp directory:', error);
      }
    },
    30 * 60 * 1000
  );
}

loadConfig();
loadMessagesData();
scheduleTempDirCleanup();

module.exports = autoexec;
