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
const {
  authenticateUsers,
  displayUserInformation,
} = require('./src/auth/core');
const { loadModules } = require('./src/utils/loader');
const { displayAsciiInfo } = require('./src/utils/ascii_info');
const { handleMute, checkAndApplyMute } = require('./src/utils/muteLogic');
const { handleError } = require('./src/utils/errorHandler');
const configManager = require('./src/utils/configManager');
const nero = require('./src/commands/userops/nero');
require('./server');

process.noDeprecation = true;

const appstateFolderPath = path.join(__dirname, 'src', 'data', 'secrets');
const devModeNotifiedUsers = new Set();

function isAuthorizedUser(userId, config) {
  const adminList = config.admins || [];
  return adminList.includes(userId);
}

async function main() {
  try {
    console.log(await displayAsciiInfo());

    const configs = configManager.initializeConfigs();
    let { exceptionList, settings, rolesConfig } = configs;

    configManager.on('configUpdated', (configKey, updatedConfig) => {
      configs[configKey] = updatedConfig;
      console.log(`${configKey} updated in real-time`);
    });

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

    const { modules, errors } = await loadModules({
      [userops]: 'user_operations',
      [adminops]: 'admin_operations',
      [autoexec]: 'automated_execution',
    });

    if (errors.length > 0) {
      console.log(
        '\n⚠️ Some modules failed to load. Check the errors above for details.'
      );
    }

    const userCmd = modules.user_operations || {};
    const adminCmd = modules.admin_operations || {};
    const automateCmd = modules.automated_execution || {};

    const authenticatedUsers = await authenticateUsers(
      appstateFolderPath,
      loginOptions
    );
    const userInformation = [];

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
              ({ exceptionList, settings, rolesConfig } = configManager.getConfigs());

              const { bots, users, threads } = exceptionList;
              if (
                (bots.includes(event.senderID) ||
                  users.includes(event.senderID) ||
                  threads.includes(event.threadID)) &&
                (users.length > 0 || threads.length > 0)
              ) {
                return;
              }

              const userId = event.senderID;
              if (handleMute(userId, api, event)) return;

              const isAdmin = isAuthorizedUser(event.senderID, rolesConfig);

              if (!settings.nero.devMode || isAdmin) {
                for (const eventHandler of Object.values(automateCmd)) {
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

              if (event.type === 'message' || event.type === 'message_reply') {
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
                  if (settings.nero.devMode && !isAdmin) {
                    if (!devModeNotifiedUsers.has(event.senderID)) {
                      api.getUserInfo(event.senderID, (err, userInfo) => {
                        if (err) {
                          console.error('Error getting user info:', err);
                          return;
                        }
                        const userName = userInfo[event.senderID].name;
                        api.sendMessage(
                          `Hello ${userName},\n\nNero is in maintenance mode for system enhancements. Only admins can run commands right now. Thanks for your understanding as we work on upgrades!\n\nHallOfCodes Team`,
                          event.threadID,
                          event.messageID
                        );
                        devModeNotifiedUsers.add(event.senderID);
                      });
                    }
                    return;
                  }

                  if (checkAndApplyMute(userId, api, event)) return;

                  async function executeCommand(cmd, event, api) {
                    if (cmd && typeof cmd === 'function') {
                      try {
                        await cmd(event, api);
                      } catch (error) {
                        handleError(`Error executing command:`, error);
                        api.sendMessage(
                          `An error occurred while executing the command: ${error.message}`,
                          event.threadID
                        );
                      }
                    } else {
                      console.error(`Invalid command structure`);
                    }
                  }

                  if (matchingAdminCommand) {
                    if (isAdmin) {
                      await executeCommand(
                        adminCmd[matchingAdminCommand],
                        event,
                        api
                      );
                    } else {
                      api.sendMessage(
                        'Command execution blocked: You are not permitted to use this command.',
                        event.threadID,
                        event.messageID
                      );
                    }
                  } else if (matchingCommand) {
                    await executeCommand(userCmd[matchingCommand], event, api);
                  }
                } else {
                  const isPrivateThread = event.threadID == event.senderID;
                  const isGroupChat = !isPrivateThread;
                  const containsQuestion =
                    /(\b(ai|what|how|did|where|who)\b|@el cano|@nexus|@nero)/i.test(
                      input
                    );

                  if (isPrivateThread || (isGroupChat && containsQuestion)) {
                    if (settings.nero.devMode && !isAdmin) {
                      if (!devModeNotifiedUsers.has(event.senderID)) {
                        api.getUserInfo(event.senderID, (err, userInfo) => {
                          if (err) {
                            console.error('Error getting user info:', err);
                            return;
                          }
                          const userName = userInfo[event.senderID].name;
                          api.sendMessage(
                            `Hello ${userName},\n\nNero is in maintenance mode for system enhancements. Only admins can run commands right now. Thanks for your understanding as we work on upgrades!\n\nHallOfCodes Team`,
                            event.threadID,
                            event.messageID
                          );
                          devModeNotifiedUsers.add(event.senderID);
                        });
                      }
                      return;
                    }
                    try {
                      await nero(event, api);
                    } catch (error) {
                      handleError(
                        `Error executing Nero in ${
                          isPrivateThread ? 'private thread' : 'group chat'
                        }:`,
                        error
                      );
                    }
                  }
                }
              }
            } catch (error) {
              handleError('Error processing event:', error);
            }
          });
        }
      }
    }

    displayUserInformation(userInformation);
  } catch (error) {
    handleError('Unhandled error in main application:', error);
  }
}

main();

