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

function adminops(event, api) {
  const input = event.body.toLowerCase().split(' ');
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();

  if (input.includes('-help')) {
    const usage = `
${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command Help

Command Usage:

1. Basic Command: 
   - Command: ${commandName}
   - Description: Displays information about the current thread, including the group ID.
   
2. Help Command:
   - Command: ${commandName} -help
   - Description: Displays help information about the command.
    `;
    api.sendMessage(usage, event.threadID);
    return;
  }

  if (packageInfo) {
    api.getThreadInfo(event.threadID, (err, info) => {
      if (err) {
        console.error('Error getting thread info:', err);
        api.sendMessage('❌ Error retrieving thread information.', event.threadID, event.messageID);
        return;
      }

      const participantCount = info.participantIDs.length;
      const threadName = info.threadName || "Unnamed thread";
      const messageCount = info.messageCount;
      const adminIDs = info.adminIDs.length;

      const message = `
${packageInfo.name} ${packageInfo.version} Thread Info Extractor


- Group ID: ${event.threadID}
- Name: ${threadName}
- Participants: ${participantCount}
- Messages: ${messageCount}
- Admins: ${adminIDs}
- Thread Type: ${info.isGroup ? 'Group' : 'One-on-one conversation'}
${info.isGroup ? `- Approval Mode: ${info.approvalMode ? 'On' : 'Off'}` : ''}
      `;

      api.sendMessage(message, event.threadID, event.messageID);
    });
  } else {
    api.sendMessage('❌ Error retrieving package information.', event.threadID, event.messageID);
  }
}

module.exports = adminops;
