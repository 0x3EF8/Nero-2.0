const path = require('path');
const fs = require('fs');

const packagePath = path.join(__dirname, '..', '..', 'package.json');
function getPackageInfo() {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageData.name,
      version: packageData.version,
    };
  } catch (error) {
    return null;
  }
}

const packageInfo = getPackageInfo();

function readConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');
  try {
    return JSON.parse(fs.readFileSync(configPath));
  } catch (error) {
    return null;
  }
}

function writeConfig(config) {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

async function adminsCommand(event, api) {
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const input = event.body.toLowerCase().trim();

  if (input.includes('-help')) {
    const usage = `
Usage: ${commandName} [-add/-rem] [user ID]

Description:
  - ${commandName} -add [user ID]: Adds the specified user to the admins list.
  - ${commandName} -add: When replying to a message, adds the message sender to the admins list.
  - ${commandName} -rem [user ID]: Removes the specified user from the admins list.
  - ${commandName} -rem: When replying to a message, removes the message sender from the admins list.
`;
    api.sendMessage(usage, event.threadID);
    return;
  }

  const command = input.split(' ')[1];

  if (input.includes('-add') || input.includes('-rem')) {
    if (input.includes('-add')) {
      return addadmins(event, api);
    } else if (input.includes('-rem')) {
      return remadmins(event, api);
    }
  } else {
    const config = readConfig();
    if (config !== null && config.hasOwnProperty('admins')) {
      try {
        const adminInfoList = await Promise.all(
          config.admins.map(async (userId) => {
            try {
              const userInfo = await getUserInfo(api, userId);
              return { name: userInfo.name, id: userId };
            } catch (error) {
              return { name: 'Unknown User', id: userId };
            }
          })
        );

        const adminsList = adminInfoList
          .map((admin) => `├─⦿ @${admin.name}`)
          .join('\n');
        const mentions = adminInfoList.map((admin) => ({
          tag: `@${admin.name}`,
          id: admin.id,
        }));

        const totaladmins = config.admins.length;
        if (packageInfo) {
          const message = {
            body: `┌────[ ${packageInfo.name} ${packageInfo.version} Admin Users ]────⦿
│
${adminsList}
│
└────[ Total Admins: ${totaladmins} ]────⦿`,
            mentions: mentions,
          };
          api.sendMessage(message, event.threadID);
        }
      } catch (error) {
        api.sendMessage('An error occurred while fetching admin names.', event.threadID);
      }
    } else {
      api.sendMessage('An error occurred while reading the admins user list.', event.threadID);
    }
  }
}

function addadmins(event, api) {
  return new Promise((resolve) => {
    const { threadID, messageReply, body } = event;
    let userId;

    if (messageReply) {
      userId = messageReply.senderID;
    } else {
      const parts = body.split(' ');
      if (parts.length < 3) {
        api.sendMessage("Please provide a user ID or reply to a user's message to add them as an admin.", threadID);
        return resolve();
      }
      userId = parts[2];
    }

    const config = readConfig();
    const adminsList = config.admins || [];

    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        api.sendMessage('Failed to get user information.', threadID);
        return resolve();
      }
      const name = data[userId].name;
      if (adminsList.includes(userId)) {
        api.sendMessage(`${name} is already an admin.`, threadID);
        resolve();
      } else {
        adminsList.push(userId);
        config.admins = adminsList;
        if (writeConfig(config)) {
          api.sendMessage(`${name} has been successfully added as an admin.`, threadID);
        } else {
          api.sendMessage('Failed to update the admin list.', threadID);
        }
        resolve();
      }
    });
  });
}

function remadmins(event, api) {
  return new Promise((resolve) => {
    const { threadID, messageReply, body } = event;
    let userId;

    if (messageReply) {
      userId = messageReply.senderID;
    } else {
      const parts = body.split(' ');
      if (parts.length < 3) {
        api.sendMessage("Please provide a user ID or reply to a user's message to remove them from admins.", threadID);
        return resolve();
      }
      userId = parts[2];
    }

    const config = readConfig();
    const adminsList = config.admins || [];

    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        api.sendMessage('Failed to get user information.', threadID);
        return resolve();
      }

      const name = data[userId].name;

      if (adminsList.includes(userId)) {
        const removeIndex = adminsList.indexOf(userId);
        adminsList.splice(removeIndex, 1);
        config.admins = adminsList;
        if (writeConfig(config)) {
          api.sendMessage(`${name} is no longer an admin.`, threadID);
        } else {
          api.sendMessage('Failed to update the admin list.', threadID);
        }
        resolve();
      } else {
        api.sendMessage(`${name} is not found in the admin list.`, threadID);
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

module.exports = adminsCommand;
