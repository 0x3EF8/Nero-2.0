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
    console.error('⚠️ Error reading package.json:', error);
    return null;
  }
}

function readSettings() {
  const settingsPath = path.join(__dirname, '..', 'config', 'settings.json');

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath));
    return formatSettings(settings);
  } catch (error) {
    console.error('⚠️ Error reading settings:', error);
    return '❌ An error occurred while reading the settings.';
  }
}

function formatSettings(settings) {
  const coreSettings = `│
├───[ Core ]───⦿
├─⦿ ListenEvents: ${settings.core.listenEvents ? '✅ True' : '❌ False'}
├─⦿ SelfListen: ${settings.core.selfListen ? '✅ True' : '❌ False'}
├─⦿ AutoMarkRead: ${settings.core.autoMarkRead ? '✅ True' : '❌ False'}
├─⦿ AutoMarkDelivery: ${settings.core.autoMarkDelivery ? '✅ True' : '❌ False'}
├─⦿ ForceLogin: ${settings.core.forceLogin ? '✅ True' : '❌ False'}
│`;

  const neroSettings = `
├───[ Nero ]───⦿
├─⦿ DevMode: ${settings.nero.devMode ? '✅ True' : '❌ False'}
├─⦿ AutoReact: ${settings.nero.autoReact ? '✅ True' : '❌ False'}
├─⦿ AntiLeave: ${settings.nero.antiLeave ? '✅ True' : '❌ False'}
├─⦿ AntiUnsend: ${settings.nero.antiUnsend ? '✅ True' : '❌ False'}
├─⦿ Prefix: ${settings.nero.prefix ? `✅ ${settings.nero.prefix}` : '❌ False'}
│`;

  return `${coreSettings}${neroSettings}`;
}

function updateSettings(settingName, value, senderID) {
  const configPath = path.join(__dirname, '..', 'config', 'roles.json');

  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    const adminsList = config.admins || [];

    if (!adminsList.includes(senderID)) {
      return '🚫 Access Denied. You lack the necessary permissions to utilize this command.';
    }

    const filePath = path.join(__dirname, '..', 'config', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { updated, message } = updateSettingValue(settings, settingName, value);

    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
      return `✅ Setting ${settingName} updated to ${value} successfully.`;
    }

    return message;
  } catch (error) {
    console.error('⚠️ Error updating settings:', error);
    return '❌ An error occurred while updating the settings.';
  }
}

function updateSettingValue(settings, settingName, value) {
  if (!settings) {
    return { updated: false, message: '❌ Settings data is invalid. Please check the settings file.' };
  }

  let updated = false;
  let message = '';

  const neroKeys = Object.keys(settings.nero);
  if (neroKeys.map(k => k.toLowerCase()).includes(settingName.toLowerCase())) {
    const newValue = value.toLowerCase() === 'true';
    const key = neroKeys.find(k => k.toLowerCase() === settingName.toLowerCase());
    if (settings.nero[key] !== newValue) {
      settings.nero[key] = newValue;
      updated = true;
    } else {
      message = `⚠️ Setting ${settingName} is already set to ${value}. No change made.`;
    }
  } else {
    const coreKeys = Object.keys(settings.core);
    const newValue = value.toLowerCase() === 'true';
    const key = coreKeys.find(k => k.toLowerCase() === settingName.toLowerCase());
    if (key) {
      if (settings.core[key] !== newValue) {
        settings.core[key] = newValue;
        updated = true;
      } else {
        message = `⚠️ Setting ${settingName} is already set to ${value}. No change made.`;
      }
    }
  }

  return { updated, message: message || '❌ No matching setting found.' };
}

function settingsCommand(event, api) {
  const input = event.body.toLowerCase().split(' ');

  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();

  if (input.includes('-help')) {
    const usage = `
${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command

The ${commandName} command allows you to view and modify system settings.

Commands:

1. View Settings:
   - Command: ${commandName}
   - Description: Displays the current settings of the bot.

2. Update Settings:
   - Command: ${commandName} -set [settingName] [value]
   - Description: Updates the specified setting to the provided value.
   - Example: ${commandName} -set prefix $

Note: 
- For prefix, use "false" to disable it or one of these characters: $, *, /, %.
- Ensure you have the required permissions to modify settings.

For further assistance, use the -help flag with any command.`;
    api.sendMessage(usage, event.threadID);
    return;
  }

  if (input.includes('-set')) {
    handleUpdateSettings(input, event, api);
  } else {
    const settings = readSettings();
    if (packageInfo) {
      const message = `
┌───[ ${packageInfo.name} ${packageInfo.version} Settings ]───⦿
${settings}
└────────⦿`;
      api.sendMessage(message, event.threadID, event.messageID);
    }
  }
}

function handleUpdateSettings(input, event, api) {
  const settingName = input[input.indexOf('-set') + 1];
  const value = input[input.indexOf('-set') + 2];
  const response = updateSettings(settingName, value, event.senderID);
  api.sendMessage(response, event.threadID);
}

module.exports = settingsCommand;
