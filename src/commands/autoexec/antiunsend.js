const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const https = require('https');

const tempDir = path.join(__dirname, '..', '..', 'data', 'temp');
const messagesJsonPath = path.join(tempDir, 'messages.json');

let messagesData = {};

async function loadMessagesData() {
  try {
    await fsPromises.mkdir(tempDir, { recursive: true });
    const data = await fsPromises.readFile(messagesJsonPath, 'utf8');
    messagesData = JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      messagesData = {};
      await saveMessagesData();
    } else {
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
    console.error('Error saving messages data:', error);
  }
}

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
          resolve(fileName);
        });
        fileStream.on('error', reject);
      })
      .on('error', reject);
  });
}

async function handleMessageUnsend(api, event) {
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
        console.error(`Error processing attachment ${i + 1}:`, err);
      }
    }
  }

  await api.sendMessage(message, event.threadID);

  for (const attachment of message.attachment) {
    await fsPromises.unlink(attachment.path).catch(console.error);
  }
}

async function autoexec(api, event) {
  const settingsPath = path.join(
    __dirname, '..', '..', 'config', 'settings.json'
  );
  try {
    const settingsData = await fsPromises.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(settingsData);

    if (settings && settings.nero && settings.nero.antiUnsend === true) {
      await loadMessagesData();

      if (event.type === 'message' || event.type === 'message_reply') {
        messagesData[event.messageID] = event;
        await saveMessagesData();
      } else if (event.type === 'message_unsend') {
        await handleMessageUnsend(api, event);
      }
    }
  } catch (error) {
    console.error('Error reading or parsing settings.json:', error);
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
        console.log('Temp directory cleaned.');
      } catch (error) {
        console.error('Error cleaning temp directory:', error);
      }
    },
    30 * 60 * 1000
  );
}

loadMessagesData();
scheduleTempDirCleanup();

module.exports = autoexec;
