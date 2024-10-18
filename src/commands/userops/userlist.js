const fs = require('fs');
const path = require('path');

async function countBotUsers(event, api) {
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const input = event.body.toLowerCase().split(' ');

  if (input.includes('-help')) {
  const usage = 
    `Command: ${commandName}

Function: Scans the active appstate files and returns a list of connected bot users.

Description: Enumerates stored appstate files and computes active user sessions.

Note: This action reads files from the system-configured directory and calculates current active user logins.`;

  api.sendMessage(usage, event.threadID);
  return;
}

  const appStateDirectory = path.join(__dirname, '..', 'config', 'cookies');

  fs.readdir(appStateDirectory, async (err, files) => {
    if (err) {
      console.error('⛔ [SYSTEM ERROR] Failed to access directory:', err);
      return;
    }

    const appStates = files.filter(
      (file) => path.extname(file).toLowerCase() === '.env'
    );

    const botUsers = [];

    for (const appState of appStates) {
      const appStateData = JSON.parse(
        fs.readFileSync(path.join(appStateDirectory, appState), 'utf8')
      );

      try {
        const c_userCookie = appStateData.find(
          (cookie) => cookie.key === 'c_user'
        );

        if (c_userCookie) {
          const uid = c_userCookie.value;
          const userInfo = await api.getUserInfo(uid);

          if (userInfo && userInfo[uid]) {
            const name = userInfo[uid].name;
            botUsers.push({ name, uid });
          }
        }
      } catch (error) {
        console.error('⚠️ [SYSTEM ERROR] Failed to retrieve user information:', error);
      }
    }

    const totalBotUsers = botUsers.length;
    let message = 'Nero-Core User Session Summary\n\n';
    for (const user of botUsers) {
      message += `User: ${user.name}\nUserID: ${user.uid}\n\n`;
    }
    message += `Total Active Users: ${totalBotUsers}\n\n[Process Complete ✅`;

    await api.sendMessage(message, event.threadID);
  });
}

module.exports = countBotUsers;