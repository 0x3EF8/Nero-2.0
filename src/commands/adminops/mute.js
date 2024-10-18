const fs = require('fs');
const path = require('path');

const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();

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

const packageInfo = getPackageInfo();

function readConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');
  try {
    return JSON.parse(fs.readFileSync(configPath));
  } catch (error) {
    console.error('⛔ [SYSTEM ERROR] Failed to read config:', error);
    return null;
  }
}

function muteCommand(event, api) {
  const input = event.body.toLowerCase().split(' ');

  if (input.includes('-help')) {
    const usage = `
Usage: ${commandName} [-add/-rem] [user ID]

Description:
  - ${commandName} -add: Adds the specified user to the mute list.
  - ${commandName} -rem: Removes the specified user from the mute list.
    `;
    api.sendMessage(usage, event.threadID);
    return Promise.resolve();
  }

  if (input.includes('-add')) {
    return addMutedUser(event, api);
  } else if (input.includes('-rem')) {
    return removeMutedUser(event, api);
  } else {
    const exceptionList = readExceptionList();
    if (exceptionList !== null && exceptionList.hasOwnProperty('users')) {
      const usersList = exceptionList.users
        .map((userId) => `├─⦿ ${userId}`)
        .join('\n');
      const totalUsers = exceptionList.users.length;
      const message = `
┌────[ ${packageInfo.name} ${packageInfo.version} Muted Users ]────⦿
│
${usersList}
│
└────[ Total Muted Users: ${totalUsers} ]────⦿
`;
      api.sendMessage(message, event.threadID);
    } else {
      api.sendMessage(
        '❌ An error occurred while reading the muted users list.',
        event.threadID
      );
    }
    return Promise.resolve();
  }
}

function addMutedUser(event, api) {
  return new Promise((resolve, reject) => {
    const { threadID, messageReply } = event;
    if (!messageReply) return resolve();

    const exceptionListPath = path.join(__dirname, '..', 'config', 'restricted_access.json');
    const exceptionList = readExceptionList();
    const usersList = exceptionList.users || [];

    const userId = messageReply.senderID;

    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        console.error('⛔ [SYSTEM ERROR] Failed to fetch user info:', error);
        return reject(error);
      }
      const name = data[userId].name;
      if (usersList.includes(userId)) {
        api.sendMessage(`${name} is already muted.`, threadID);
        resolve();
      } else {
        usersList.push(userId);
        exceptionList.users = usersList;
        fs.writeFileSync(
          exceptionListPath,
          JSON.stringify(exceptionList, null, 2),
          'utf8'
        );
        api.sendMessage(`${name} has been successfully muted.`, threadID);
        resolve();
      }
    });
  });
}

function removeMutedUser(event, api) {
  return new Promise((resolve, reject) => {
    const { threadID, messageReply } = event;
    if (!messageReply) return resolve();

    const exceptionListPath = path.join(__dirname, '..', 'config', 'restricted_access.json');
    const exceptionList = readExceptionList();
    const usersList = exceptionList.users || [];

    const userId = messageReply.senderID;

    api.getUserInfo(parseInt(userId), (error, data) => {
      if (error) {
        console.error('⛔ [SYSTEM ERROR] Failed to fetch user info:', error);
        return reject(error);
      }

      const name = data[userId].name;

      if (usersList.includes(userId)) {
        const removeIndex = usersList.indexOf(userId);
        usersList.splice(removeIndex, 1);
        exceptionList.users = usersList;
        fs.writeFileSync(
          exceptionListPath,
          JSON.stringify(exceptionList, null, 2),
          'utf8'
        );
        api.sendMessage(`${name} is no longer muted.`, threadID);
        resolve();
      } else {
        api.sendMessage(
          `${name} is not found in the muted users list.`,
          threadID
        );
        resolve();
      }
    });
  });
}

function readExceptionList() {
  const exceptionListPath = path.join(__dirname, '..', 'config', 'restricted_access.json'); 
  try {
    return JSON.parse(fs.readFileSync(exceptionListPath));
  } catch (error) {
    console.error('⛔ [SYSTEM ERROR] Failed to read exception list:', error);
    return null;
  }
}

module.exports = muteCommand;
