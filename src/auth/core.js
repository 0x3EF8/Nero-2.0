const fs = require('fs').promises;
const path = require('path');
const login = require('../engine/hexa-core');
const chalk = require('chalk');

async function authenticateUsers(appstateFolderPath, loginOptions) {
  const files = await fs.readdir(appstateFolderPath);
  const appStates = files.filter((file) => path.extname(file) === '.env');

  const loginPromises = appStates.map(async (appState) => {
    const appStateData = JSON.parse(
      await fs.readFile(path.join(appstateFolderPath, appState), 'utf8')
    );

    return new Promise(async (resolve) => {
      let retries = 3;
      while (retries > 0) {
        try {
          const api = await loginWithRetry(appStateData, loginOptions);
          const userInfo = await getUserInfo(api);
          const userId = api.getCurrentUserID();
          
          if (!userInfo || !userInfo[userId] || !userInfo[userId].name) {
            throw new Error('Unable to retrieve user name from API response');
          }
          
          const userName = userInfo[userId].name;
          console.log(chalk.green(`✅ Login successful for user: ${userName}`));
          resolve({ api, userName, appState });
          return;
        } catch (error) {
          console.error(chalk.yellow(`⚠️ Login attempt failed for ${appState}. Retries left: ${retries - 1}`));
          console.error(chalk.red(error.message));
          retries--;
          if (retries === 0) {
            console.error(chalk.red(`❌ All login attempts failed for ${appState}`));
            resolve(null);
          } else {
            await new Promise(r => setTimeout(r, 5000));
          }
        }
      }
    });
  });

  return Promise.all(loginPromises);
}

function loginWithRetry(appState, loginOptions) {
  return new Promise((resolve, reject) => {
    login({ appState }, (err, api) => {
      if (err) {
        reject(new Error(err.message));
        return;
      }
      api.setOptions(loginOptions);
      resolve(api);
    });
  });
}

function getUserInfo(api) {
  return new Promise((resolve, reject) => {
    api.getUserInfo(api.getCurrentUserID(), (err, ret) => {
      if (err) {
        reject(new Error(`Failed to retrieve user information: ${err.error || err.message || 'Unknown error'}`));
      } else if (!ret || typeof ret !== 'object') {
        reject(new Error('Invalid user information received from API'));
      } else {
        resolve(ret);
      }
    });
  });
}

function displayUserInformation(userInformation) {
  console.log('--------------------------------------------------');
  console.log(chalk.cyan('User Authentication Report'));
  console.log('--------------------------------------------------');
  if (userInformation.length === 0) {
    console.log(chalk.red('No users were successfully authenticated.'));
  } else {
    for (const { userName, appState } of userInformation) {
      if (userName) {
        console.log(chalk.green(`Verified User: ${userName}`));
      } else {
        console.log(chalk.yellow(`Authenticated User (name unavailable)`));
      }
      console.log(`Authentication Record: ${appState}`);
    }
  }
  console.log('--------------------------------------------------');
}

module.exports = { authenticateUsers, displayUserInformation };