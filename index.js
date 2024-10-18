/**
 * BETA VERSION - TESTING PHASE
 *
 * This is **Nero 2.0**, a Facebook bot developed by **Jay Patrick Cano** using a modified
 * version of **fca-unofficial** with fixes from **John Paul Caigas**. This script is in
 * the **beta testing phase**, and users may encounter errors during use.
 *
 * Key Points:
 * - **Potential Bugs**: This version may still have undiscovered bugs and may not behave
 *   as expected.
 * - **Not Production Ready**: It is not optimized for stability or performance and is
 *   intended for testing only.
 * - **Event Handling**: Event listeners and command handling may require further testing
 *   for complex scenarios.
 *
 * Please report any issues or feedback as development continues. Use this script at your
 * own risk.
 */

const path = require('path');
const fs = require('fs').promises;
const fsWatch = require('fs');
const chalk = require('chalk');
const {
  authenticateUsers,
  displayUserInformation,
} = require('./src/auth/core');
const { loadModules } = require('./src/utils/loader');
const { displayAsciiInfo } = require('./src/utils/ascii_info');
const nero = require('./src/commands/userops/nero');
require('./server');
process.noDeprecation = true;

const appstateFolderPath = path.join(__dirname, 'src', 'data', 'secrets');

const mutedUsersReminded = new Set();
const mutedUsers = new Map();
const userCommandHistory = new Map();
const devModeNotifiedUsers = new Set();
const MUTE_DURATION = 10 * 60 * 1000;
const COMMAND_LIMIT = 4;
const TIME_LIMIT = 5 * 60 * 1000;

function clearTerminal() {
  if (process.platform === 'win32') {
    process.stdout.write('\x1B[2J\x1B[0f');
  } else {
    process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
  }
}

function handleError(error) {
  console.error(chalk.red('⚠️ Error:'), error);
}

function watchJsonFiles(filePath, callback) {
  fsWatch.watch(filePath, { encoding: 'utf8' }, (eventType, filename) => {
    if (eventType === 'change') {
      callback(filename);
    }
  });
}

function formatMuteDuration(duration) {
  const hours = Math.floor(duration / (60 * 60 * 1000));
  const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((duration % (60 * 1000)) / 1000);

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

(async () => {
  try {
    clearTerminal();
    const asciiInfo = await displayAsciiInfo();
    console.log(asciiInfo);
  } catch (error) {
    handleError('Error displaying ASCII info:', error);
  }

  let exceptionList, settings;

  try {
    const exceptionListFilePath = path.join(
      __dirname,
      'src',
      'config',
      'restricted_access.json'
    );
    exceptionList = JSON.parse(
      await fs.readFile(exceptionListFilePath, 'utf8')
    );
  } catch (error) {
    handleError('Error reading exception list:', error);
    exceptionList = { bots: [], users: [], threads: [] };
  }

  const bots = exceptionList.bots || [];
  const users = exceptionList.users || [];
  const threads = exceptionList.threads || [];

  try {
    const settingsFilePath = path.join(
      __dirname,
      'src',
      'config',
      'settings.json'
    );
    settings = JSON.parse(await fs.readFile(settingsFilePath, 'utf8'));
    watchJsonFiles(settingsFilePath, async () => {
      try {
        settings = JSON.parse(await fs.readFile(settingsFilePath, 'utf8'));
        console.log(
          chalk.green(`Settings updated: ${JSON.stringify(settings)}`)
        );
      } catch (error) {
        handleError('Error reading updated settings:', error);
      }
    });
  } catch (error) {
    handleError('Error reading settings:', error);
    settings = [{}];
  }

  const loginOptions = {
    listenEvents: settings.core.listenEvents,
    selfListen: settings.core.selfListen,
    autoMarkRead: settings.core.autoMarkRead,
    autoMarkDelivery: settings.core.autoMarkDelivery,
    forceLogin: settings.core.forceLogin,
  };

  const userops = path.join(__dirname, 'src', 'commands', 'userops');
  const adminops = path.join(__dirname, 'src', 'commands', 'adminops');
  const autoexec = path.join(__dirname, 'src', 'commands', 'autoexec');
  let modules, errors;
  try {
    ({ modules, errors } = await loadModules({
      [userops]: 'user_operations',
      [adminops]: 'admin_operations',
      [autoexec]: 'automated_execution',
    }));
    if (errors.length > 0) {
      console.log(
        chalk.yellow(
          '\n⚠️ Some modules failed to load. Check the errors above for details.'
        )
      );
    }
  } catch (error) {
    handleError('Error loading modules:', error);
    modules = {
      user_operations: {},
      admin_operations: {},
      automated_execution: {},
    };
    errors = [];
  }

  const userCmd = modules.user_operations || {};
  const adminCmd = modules.admin_operations || {};
  const automateCmd = modules.automated_execution || {};
  const userInformation = [];

  let authenticatedUsers;
  try {
    authenticatedUsers = await authenticateUsers(
      appstateFolderPath,
      loginOptions
    );
  } catch (error) {
    handleError('Error authenticating users:', error);
    authenticatedUsers = [];
  }

  for (const user of authenticatedUsers) {
    if (user) {
      const { api, userName, appState } = user;
      if (userName) {
        userInformation.push({ userName, appState });
      }

      if (api && typeof api.listenMqtt === 'function') {
        api.listenMqtt(async (err, event) => {
          if (err) {
            handleError('Error in listenMqtt:', err);
            return;
          }

          try {
            if (
              (bots.includes(event.senderID) ||
                users.includes(event.senderID) ||
                threads.includes(event.threadID)) &&
              (users.length > 0 || threads.length > 0)
            ) {
              return;
            }

            const userId = event.senderID;
            const userMuteInfo = mutedUsers.get(userId);

            if (userMuteInfo) {
              const { timestamp } = userMuteInfo;

              if (Date.now() - timestamp >= MUTE_DURATION) {
                mutedUsers.delete(userId);
                mutedUsersReminded.delete(userId);
                console.log(`User ${userId} has been unmuted.`);
              } else {
                if (!mutedUsersReminded.has(userId)) {
                  try {
                    api.getUserInfo(userId, async (err, ret) => {
                      if (err) {
                        handleError('Error getting user info:', err);
                        return;
                      }
                      if (ret && ret[userId] && ret[userId].name) {
                        const userName = ret[userId].name;
                        const remainingTime =
                          MUTE_DURATION - (Date.now() - timestamp);
                        const formattedDuration =
                          formatMuteDuration(remainingTime);
                        api.sendMessage(
                          `Hello ${userName}, you are currently muted. Please patiently wait for ${formattedDuration} to regain access.
                          
                          Please note that this message is a one-time notification and will not be sent again to avoid any inconvenience.`,
                          event.threadID,
                          event.messageID
                        );
                        mutedUsersReminded.add(userId);
                      }
                    });
                  } catch (error) {
                    handleError('Error getting user info:', error);
                  }
                }
                return;
              }
            }

            const configFilePath = path.join(
              __dirname,
              'src',
              'config',
              'roles.json'
            );
            const config = JSON.parse(
              await fs.readFile(configFilePath, 'utf8')
            );

            function isAuthorizedUser(userId, config) {
              const adminList = config.admins || [];
              return adminList.includes(userId);
            }

            const isAdmin = isAuthorizedUser(event.senderID, config);

            if (settings.nero.devMode && !isAdmin) {
              if (event.type === 'message' || event.type === 'message_reply') {
                const prefix = settings.nero.prefix;
                let input = event.body.toLowerCase().trim();

                const matchingCommand = Object.keys(userCmd).find(
                  (commandName) => {
                    const commandPattern = new RegExp(
                      `^${commandName}(\\s+.*|$)`
                    );
                    return commandPattern.test(input);
                  }
                );

                if (matchingCommand) {
                  if (!devModeNotifiedUsers.has(event.senderID)) {
                    api.getUserInfo(event.senderID, (err, userInfo) => {
                      if (err) {
                        console.error('Error getting user info:', err);
                        return;
                      }
                      const userName = userInfo[event.senderID].name;
                      api.sendMessage(
                        `Hello ${userName},

Nero is in maintenance mode for system enhancements. Only admins can run commands right now. Thanks for your understanding as we work on upgrades!

HallOfCodes Team`,
                        event.threadID,
                        event.messageID
                      );
                      devModeNotifiedUsers.add(event.senderID);
                    });
                  }
                  return;
                }
              }
            }

            if (!settings.nero.devMode || isAdmin) {
              for (const eventHandler of Object.values(automateCmd)) {
                if (!userMuteInfo) {
                  try {
                    await eventHandler(api, event);
                  } catch (error) {
                    handleError(
                      `Error executing event handler for event type ${event.type}:`,
                      error
                    );
                  }
                }
              }
            }

            if (event.type === 'message' || event.type === 'message_reply') {
              try {
                const prefix = settings.nero.prefix;

                let input = event.body.toLowerCase().trim();

                if (!input.startsWith(prefix) && prefix !== false) {
                  return;
                }

                if (prefix !== false) {
                  input = input.substring(prefix.length).trim();
                }

                const matchingCommand = Object.keys(userCmd).find(
                  (commandName) => {
                    const commandPattern = new RegExp(
                      `^${commandName}(\\s+.*|$)`
                    );
                    return commandPattern.test(input);
                  }
                );

                const matchingAdminCommand = Object.keys(adminCmd).find(
                  (commandName) => {
                    const commandPattern = new RegExp(
                      `^${commandName}(\\s+.*|$)`
                    );
                    return commandPattern.test(input);
                  }
                );

                if (matchingCommand || matchingAdminCommand) {
                  const userId = event.senderID;
                  const commandHistory = userCommandHistory.get(userId) || [];
                  const now = Date.now();
                  const recentCommands = commandHistory.filter(
                    (timestamp) => now - timestamp <= TIME_LIMIT
                  );

                  recentCommands.push(now);
                  userCommandHistory.set(userId, recentCommands);

                  if (recentCommands.length > COMMAND_LIMIT && !isAdmin) {
                    if (!mutedUsers.has(userId)) {
                      mutedUsers.set(userId, {
                        timestamp: now,
                        commandCount: recentCommands.length,
                      });
                      const formattedDuration =
                        formatMuteDuration(MUTE_DURATION);
                      api.sendMessage(
                        `Ohh no, you're going too fast. You have been muted for ${formattedDuration} for excessive command usage.`,
                        event.threadID,
                        event.messageID
                      );
                      console.log(
                        `User ${userId} muted for excessive command usage`
                      );
                    }
                  } else {
                    // api.sendTypingIndicator(event.threadID);
                    if (matchingAdminCommand) {
                      if (isAdmin) {
                        const cmd = adminCmd[matchingAdminCommand];
                        if (cmd && typeof cmd === 'function') {
                          try {
                            await cmd(event, api);
                          } catch (error) {
                            handleError(
                              `Error executing admin command ${matchingAdminCommand}:`,
                              error
                            );
                            api.sendMessage(
                              `An error occurred while executing the admin command: ${error.message}`,
                              event.threadID
                            );
                          }
                        } else {
                          console.error(
                            `Invalid admin command structure for ${matchingAdminCommand}`
                          );
                        }
                      } else {
                        api.sendMessage(
                          "Command execution blocked: You are not permitted to use this command.",
                          event.threadID,
                          event.messageID
                        );
                      }
                    } else if (matchingCommand) {
                      const cmd = userCmd[matchingCommand];
                      if (cmd && typeof cmd === 'function') {
                        try {
                          await cmd(event, api);
                        } catch (error) {
                          handleError(
                            `Error executing command ${matchingCommand}:`,
                            error
                          );
                          api.sendMessage(
                            `An error occurred while executing the command: ${error.message}`,
                            event.threadID
                          );
                        }
                      } else {
                        console.error(
                          `Invalid command structure for ${matchingCommand}`
                        );
                      }
                    }
                  }
                } else {
                  const isPrivateThread = event.threadID == event.senderID;
                  const isGroupChat = !isPrivateThread;
                  const containsQuestion =
                    /(\b(ai|what|how|did|where|who)\b|@el cano|@nexus|@nero)/i.test(
                      input
                    );

                  if (!mutedUsers.has(event.senderID)) {
                    if (isPrivateThread) {
                      // api.sendTypingIndicator(event.threadID);
                      try {
                        await nero(event, api);
                      } catch (error) {
                        handleError(
                          'Error executing Nero in private thread:',
                          error
                        );
                      }
                    } else if (isGroupChat && containsQuestion) {
                      // api.sendTypingIndicator(event.threadID);
                      try {
                        await nero(event, api);
                      } catch (error) {
                        handleError(
                          'Error executing Nero in group chat:',
                          error
                        );
                      }
                    }
                  }
                }
              } catch (error) {
                handleError('Error handling the command:', error);
              }
            }
          } catch (error) {
            handleError('Error processing event:', error);
          }
        });
      }
    }
  }

  const exceptionListFilePath = path.join(
    __dirname,
    'src',
    'config',
    'restricted_access.json'
  );
  watchJsonFiles(exceptionListFilePath, async () => {
    try {
      exceptionList = JSON.parse(
        await fs.readFile(exceptionListFilePath, 'utf8')
      );
      console.log(
        chalk.green(`Exception list updated: ${JSON.stringify(exceptionList)}`)
      );
    } catch (error) {
      handleError('Error reading updated exception list:', error);
    }
  });

  const rolesConfigFilePath = path.join(
    __dirname,
    'src',
    'config',
    'roles.json'
  );
  watchJsonFiles(rolesConfigFilePath, async () => {
    try {
      const config = JSON.parse(await fs.readFile(rolesConfigFilePath, 'utf8'));
      console.log(
        chalk.green(`Roles config updated: ${JSON.stringify(config)}`)
      );
    } catch (error) {
      handleError('Error reading updated roles config:', error);
    }
  });

  displayUserInformation(userInformation);
})().catch((error) =>
  handleError('Unhandled error in main application:', error)
);
