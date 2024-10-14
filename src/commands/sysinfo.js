const path = require('path');
const fs = require('fs');
const os = require('os');
const execSync = require('child_process').execSync;

const packagePath = path.join(__dirname, '..', '..', 'package.json');
let neroStartTime = Date.now();

function getPackageInfo() {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      name: packageData.name,
      version: packageData.version,
    };
  } catch (error) {
    console.error('Error reading package.json:', error);
    return null;
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  let uptimeString = '';
  if (days > 0) uptimeString += `${days}d `;
  if (hours > 0 || days > 0) uptimeString += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) uptimeString += `${minutes}m `;
  uptimeString += `${remainingSeconds}s`;
  
  return uptimeString.trim();
}

function getSystemUptime() {
  return os.uptime();
}

function getNeroUptime() {
  const currentTime = Date.now();
  const elapsedTime = (currentTime - neroStartTime) / 1000;
  return Math.floor(elapsedTime);
}

function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const totalDisk = execSync('df -h --output=size | tail -1', { encoding: 'utf-8' }).trim();
  const usedDisk = execSync('df -h --output=used | tail -1', { encoding: 'utf-8' }).trim();
  const cpuInfo = os.cpus();
  const hostname = os.hostname();
  const platform = os.platform();
  const release = os.release();
  
  const memoryUsage = {
    total: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
    used: (usedMem / (1024 * 1024 * 1024)).toFixed(2),
  };

  return {
    hostname,
    platform,
    release,
    memoryUsage,
    totalDisk,
    usedDisk,
    cpuCores: cpuInfo.length,
  };
}

function startNero() {
  neroStartTime = Date.now();
}

startNero();

function sysinfoCommand(event, api) {
  const input = event.body.toLowerCase().split(' ');
  const commandName = path.basename(__filename, path.extname(__filename)).toLowerCase();
  const packageInfo = getPackageInfo();

  if (input.includes('-help')) {
    const usage = `
${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command Help

Command Usage:

1. Basic Command: 
   - Command: ${commandName}
   - Description: Displays detailed system information and uptime.
   
2. Help Command:
   - Command: ${commandName} -help
   - Description: Displays help information about the command.
    `;
    api.sendMessage(usage, event.threadID);
    return;
  }

  if (packageInfo) {
    const systemInfo = getSystemInfo();
    const systemUptime = formatUptime(getSystemUptime());
    const neroUptime = formatUptime(getNeroUptime());

    const message = `
${packageInfo.name} ${packageInfo.version} System Information

Uptime Overview:
- System Uptime: ${systemUptime}
- Nero Uptime: ${neroUptime}

System Overview:
- Hostname: ${systemInfo.hostname}
- OS: ${systemInfo.platform} ${systemInfo.release}
- RAM: ${systemInfo.memoryUsage.used} GB Used / ${systemInfo.memoryUsage.total} GB Total
- ROM: ${systemInfo.usedDisk} Used / ${systemInfo.totalDisk} Total
- CPU Cores: ${systemInfo.cpuCores} cores
    `;
    api.sendMessage(message.trim(), event.threadID, event.messageID);
  } else {
    api.sendMessage('Error retrieving package information.', event.threadID, event.messageID);
  }
}

module.exports = sysinfoCommand;
