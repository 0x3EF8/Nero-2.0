const path = require('path');
const fs = require('fs');

const packagePath = path.join(__dirname, '..', '..', '..', 'package.json');

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

async function adminops(event, api) {
  const input = event.body.toLowerCase().split(' ');
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();

  if (input.includes('-help')) {
    const usage = `
${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command Help

Command Usage:

1. Show Pending Requests: 
   - Command: ${commandName}
   - Description: Shows a list of pending message requests from both regular and spam folders.

2. Accept All Requests:
   - Command: ${commandName} -all
   - Description: Accepts all pending message requests from both regular and spam folders.

3. Accept Specific Person Requests:
   - Command: ${commandName} -P [numbers]
   - Description: Accepts message requests from specific persons. Example: ${commandName} -P 1,2,3

4. Accept Specific Group Requests:
   - Command: ${commandName} -G [numbers]
   - Description: Accepts message requests from specific groups. Example: ${commandName} -G 1,2,3

5. Help Command:
   - Command: ${commandName} -help
   - Description: Displays help information about the command.
    `;
    api.sendMessage(usage, event.threadID);
    return;
  }

  if (!packageInfo) {
    api.sendMessage('❌ Error retrieving package information.', event.threadID, event.messageID);
    return;
  }

  try {
    const regularRequests = await api.getThreadList(1000, null, ['PENDING']);
    const spamRequests = await api.getThreadList(1000, null, ['OTHER']);
    const allRequests = [...regularRequests, ...spamRequests];

    const persons = allRequests.filter(thread => !thread.isGroup);
    const groups = allRequests.filter(thread => thread.isGroup && thread.participantIDs.includes(api.getCurrentUserID()));

    if (input.length === 1) {
      let message = `${packageInfo.name} ${packageInfo.version} Pending Messages\n\n`;

      if (persons.length > 0) {
        message += "Person" + (persons.length > 1 ? "s" : "") + "\n";
        persons.forEach((person, index) => {
          message += `${index + 1}, ${person.name}${spamRequests.includes(person) ? ' (Spam)' : ''}\n`;
        });
        message += "\n";
      }

      if (groups.length > 0) {
        message += "Group" + (groups.length > 1 ? "s" : "") + "\n";
        groups.forEach((group, index) => {
          message += `${index + 1}, ${group.name}${spamRequests.includes(group) ? ' (Spam)' : ''}\n`;
        });
      }

      api.sendMessage(message.trim(), event.threadID, event.messageID);
    } else if (input.includes('-all')) {
      for (let thread of [...persons, ...groups]) {
        await api.handleMessageRequest(thread.threadID, true);
      }
      api.sendMessage(`Accepted all ${persons.length + groups.length} pending message requests.`, event.threadID, event.messageID);
    } else if (input.includes('-p')) {
      const numbers = input.slice(input.indexOf('-p') + 1).join('').split(',').map(Number);
      let acceptedCount = 0;
      for (let number of numbers) {
        if (number > 0 && number <= persons.length) {
          await api.handleMessageRequest(persons[number - 1].threadID, true);
          acceptedCount++;
        }
      }
      api.sendMessage(`Accepted ${acceptedCount} person message requests.`, event.threadID, event.messageID);
    } else if (input.includes('-g')) {      
      const numbers = input.slice(input.indexOf('-g') + 1).join('').split(',').map(Number);
      let acceptedCount = 0;
      for (let number of numbers) {
        if (number > 0 && number <= groups.length) {
          await api.handleMessageRequest(groups[number - 1].threadID, true);
          acceptedCount++;
        }
      }
      api.sendMessage(`Accepted ${acceptedCount} group message requests.`, event.threadID, event.messageID);
    } else {
      api.sendMessage(`Invalid command. Use '${commandName} -help' for usage information.`, event.threadID, event.messageID);
    }
  } catch (error) {
    console.error('Error handling message requests:', error);
    api.sendMessage('❌ An error occurred while processing message requests.', event.threadID, event.messageID);
  }
}

module.exports = adminops;
