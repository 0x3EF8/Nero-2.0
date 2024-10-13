const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', '..', 'package.json');

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

function readConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');
  try {
    return JSON.parse(fs.readFileSync(configPath));
  } catch (error) {
    console.error('⚠️ Error reading config:', error);
    return null;
  }
}

function writeConfig(config) {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('⚠️ Error writing config:', error);
    return false;
  }
}

function isAdmins(userId) {
  const config = readConfig();
  if (config !== null && config.hasOwnProperty('admins')) {
    const adminsList = config.admins || [];
    return adminsList.includes(userId);
  }
  return false;
}

async function VIPCommand(event, api) {
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();
  const input = event.body.toLowerCase().trim();

if (input.includes('-help')) {
  const usage = 
    `Usage: ${commandName} [-add/-rem] [user ID]

Description:
  - ${commandName} -add [user ID]: Adds the specified user to the VIP Users List.
  - ${commandName} -add: When replying to a message, adds the message sender to the VIP Users List.
  - ${commandName} -rem [user ID]: Removes the specified user from the VIP Users List.
  - ${commandName} -rem: When replying to a message, removes the message sender from the VIP Users List.

Note: Only admins can use this command.`;

  api.sendMessage(usage, event.threadID);
  return;
}

  if (!isAdmins(event.senderID)) {
    api.sendMessage('🚫 Only admins can use this command.', event.threadID);
    return;
  }

  if (input.includes('-add') || input.includes('-rem')) {
    if (input.includes('-add')) {
      return addVIP(event, api);
    } else if (input.includes('-rem')) {
      return remVIP(event, api);
    }
  } else {
    const config = readConfig();
    if (config !== null && config.hasOwnProperty('vips')) {
      try {
        const vipInfoList = await Promise.all(
          config.vips.map(async (userId) => {
            try {
              const userInfo = await getUserInfo(api, userId);
              return { name: userInfo.name, id: userId };
            } catch (error) {
              console.error(`⚠️ Error fetching user info for ${userId}:`, error);
              return { name: 'Unknown User', id: userId };
            }
          })
        );

        const vipList = vipInfoList.map((vip) => `├─⦿ @${vip.name}`).join('\n');
        const mentions = vipInfoList.map((vip) => ({
          tag: `@${vip.name}`,
          id: vip.id,
        }));

        const totalVIPs = config.vips.length;

        if (packageInfo) {
          const message = {
            body: `┌────[ ${packageInfo.name} ${packageInfo.version} VIP Users ]────⦿\n` +
                  `│\n${vipList}\n` +
                  `│\n└────[ Total VIP users: ${totalVIPs} ]────⦿`,
            mentions: mentions,
          };

          api.sendMessage(message, event.threadID);
        } else {
          api.sendMessage(
            '❌ An error occurred while reading the VIP user list.',
            event.threadID
          );
        }
      } catch (error) {
        console.error('⚠️ Error fetching VIP names:', error);
        api.sendMessage(
          '❌ An error occurred while fetching VIP names.',
          event.threadID
        );
      }
    } else {
      api.sendMessage(
        '❌ An error occurred while reading the VIP user list.',
        event.threadID
      );
    }
  }
}

function addVIP(event, api) {
  return new Promise((resolve, reject) => {
    const { threadID, messageReply, body } = event;
    let userId;

    if (messageReply) {
      userId = messageReply.senderID;
    } else {
      const parts = body.split(' ');
      if (parts.length < 3) {
        api.sendMessage(
          "⚠️ Please provide a user ID or reply to a user's message to add them as a VIP.",
          threadID
        );
        return resolve();
      }
      userId = parts[2];
    }

    const config = readConfig();
    const vipList = config.vips || [];

    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        console.error(error);
        api.sendMessage('❌ Failed to get user information.', threadID);
        return reject(error);
      }
      const name = data[userId].name;
      if (vipList.includes(userId)) {
        api.sendMessage(`${name} is already a VIP.`, threadID);
        resolve();
      } else {
        vipList.push(userId);
        config.vips = vipList;
        if (writeConfig(config)) {
          api.sendMessage(
            `${name} has been successfully added as a VIP.`,
            threadID
          );
        } else {
          api.sendMessage('❌ Failed to update the VIP list.', threadID);
        }
        resolve();
      }
    });
  });
}

function remVIP(event, api) {
  return new Promise((resolve, reject) => {
    const { threadID, messageReply, body } = event;
    let userId;

    if (messageReply) {
      userId = messageReply.senderID;
    } else {
      const parts = body.split(' ');
      if (parts.length < 3) {
        api.sendMessage(
          "⚠️ Please provide a user ID or reply to a user's message to remove them from VIPs.",
          threadID
        );
        return resolve();
      }
      userId = parts[2];
    }

    const config = readConfig();
    const vipList = config.vips || [];

    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        console.error(error);
        api.sendMessage('❌ Failed to get user information.', threadID);
        return reject(error);
      }

      const name = data[userId].name;

      if (vipList.includes(userId)) {
        const removeIndex = vipList.indexOf(userId);
        vipList.splice(removeIndex, 1);
        config.vips = vipList;
        if (writeConfig(config)) {
          api.sendMessage(`${name} is no longer a VIP.`, threadID);
        } else {
          api.sendMessage('❌ Failed to update the VIP list.', threadID);
        }
        resolve();
      } else {
        api.sendMessage(`${name} is not found in the VIP list.`, threadID);
        resolve();
      }
    });
  });
}

function getUserInfo(api, userId) {
  return new Promise((resolve, reject) => {
    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data[userId]);
      }
    });
  });
}

module.exports = VIPCommand;