const mutedUsersReminded = new Set();
const mutedUsers = new Map();
const userCommandHistory = new Map();
const MUTE_DURATION = 10 * 60 * 1000;
const COMMAND_LIMIT = 4;
const TIME_LIMIT = 5 * 60 * 1000;

function formatMuteDuration(duration) {
  const hours = Math.floor(duration / (60 * 60 * 1000));
  const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((duration % (60 * 1000)) / 1000);

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 || parts.length === 0)
    parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

  return parts.join(', ');
}

function handleMute(userId, api, event) {
  const userMuteInfo = mutedUsers.get(userId);
  if (userMuteInfo) {
    const { timestamp } = userMuteInfo;
    if (Date.now() - timestamp >= MUTE_DURATION) {
      mutedUsers.delete(userId);
      mutedUsersReminded.delete(userId);
      console.log(`User ${userId} has been unmuted.`);
      return false;
    } else if (!mutedUsersReminded.has(userId)) {
      api.getUserInfo(userId, (err, ret) => {
        if (err) {
          console.error('Error getting user info:', err);
          return;
        }
        if (ret && ret[userId] && ret[userId].name) {
          const userName = ret[userId].name;
          const remainingTime = MUTE_DURATION - (Date.now() - timestamp);
          const formattedDuration = formatMuteDuration(remainingTime);
          api.sendMessage(
            `Hello ${userName}, you are currently muted. Please patiently wait for ${formattedDuration} to regain access.\n\nPlease note that this message is a one-time notification and will not be sent again to avoid any inconvenience.`,
            event.threadID,
            event.messageID
          );
          mutedUsersReminded.add(userId);
        }
      });
    }
    return true;
  }
  return false;
}

function checkAndApplyMute(userId, api, event) {
  const commandHistory = userCommandHistory.get(userId) || [];
  const now = Date.now();
  const recentCommands = commandHistory.filter(
    (timestamp) => now - timestamp <= TIME_LIMIT
  );

  recentCommands.push(now);
  userCommandHistory.set(userId, recentCommands);

  if (recentCommands.length > COMMAND_LIMIT) {
    if (!mutedUsers.has(userId)) {
      mutedUsers.set(userId, {
        timestamp: now,
        commandCount: recentCommands.length,
      });
      const formattedDuration = formatMuteDuration(MUTE_DURATION);
      api.sendMessage(
        `Ohh no, you're going too fast. You have been muted for ${formattedDuration} for excessive command usage.`,
        event.threadID,
        event.messageID
      );
      console.log(`User ${userId} muted for excessive command usage`);
      return true;
    }
  }
  return false;
}

module.exports = { handleMute, checkAndApplyMute };
