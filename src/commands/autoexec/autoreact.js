const fs = require('fs').promises;
const path = require('path');

async function autoexec(api, event) {
  const settingsPath = path.join(
    __dirname, '..', '..', 'config', 'settings.json'
  );
  try {
    const settingsData = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(settingsData);

    if (settings && settings.nero && settings.nero.autoReact === true) {
      if (event.type === 'message_reaction') {        
        if (event.senderID !== api.getCurrentUserID()) {
          try {
            await api.setMessageReaction(event.reaction, event.messageID, (err) => {
              if (err) {
               // console.error(`Error mirroring reaction '${event.reaction}':`, err);
              } else {
               // console.log(`Mirrored reaction '${event.reaction}' on message ${event.messageID}`);
              }
            }, true);
          } catch (error) {
          //  console.error(`Error setting mirrored reaction:`, error);
          }
        }
      }
    }
  } catch (error) {
    // console.error('Error reading or parsing settings.json:', error);
  }
}

module.exports = autoexec;
