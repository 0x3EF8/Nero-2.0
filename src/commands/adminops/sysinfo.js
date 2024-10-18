const path = require('path');
const fs = require('fs');
const os = require('os');
const execSync = require('child_process').execSync;

const packagePath = path.join(__dirname, '..', '..', '..', 'package.json');
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

function getDistroInfo() {
  try {
    const distroInfo = fs
      .readFileSync('/etc/os-release', 'utf8')
      .split('\n')
      .reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          acc[key] = value.replace(/"/g, '');
        }
        return acc;
      }, {});
    return distroInfo.PRETTY_NAME || 'Unknown Distro';
  } catch (error) {
    console.error('Error reading /etc/os-release:', error);
    return 'Unknown Distro';
  }
}

function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  let totalDisk, freeDisk;
  try {
    totalDisk = execSync('df -h --output=size / | tail -1', {
      encoding: 'utf-8',
    }).trim();
    freeDisk = execSync('df -h --output=avail / | tail -1', {
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    totalDisk = 'N/A';
    freeDisk = 'N/A';
  }

  const cpuInfo = os.cpus();
  const hostname = os.hostname();
  const platform = os.platform();
  const release = os.release();
  const distro = getDistroInfo();

  return {
    hostname,
    platform,
    release,
    distro,
    memoryUsage: {
      total: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
      free: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
    },
    totalDisk,
    freeDisk,
    cpuCores: cpuInfo.length,
  };
}

function startNero() {
  neroStartTime = Date.now();
}

startNero();

function adminops(event, api) {
  const input = event.body.toLowerCase().split(' ');
  const commandName = path
    .basename(__filename, path.extname(__filename))
    .toLowerCase();
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
${packageInfo.name} ${packageInfo.version} System Information:

• Node.js: ${process.version}
• Environment: ${process.env.NODE_ENV || 'development'}
• Hostname: ${systemInfo.hostname}
• OS: ${systemInfo.platform} ${systemInfo.release}
• Distro: ${systemInfo.distro}
• CPU Cores: ${systemInfo.cpuCores}
• Total Memory: ${systemInfo.memoryUsage.total} GB
• Free Memory: ${systemInfo.memoryUsage.free} GB
• Total Storage: ${systemInfo.totalDisk}
• Free Storage: ${systemInfo.freeDisk}

Runtime Details:
• Process ID: ${process.pid}
• Start Time: ${new Date(neroStartTime).toLocaleString()}
• ${packageInfo.name} Uptime: ${neroUptime}
• System Uptime: ${systemUptime}
• Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
    `;
    api.sendMessage(message.trim(), event.threadID, event.messageID);
  } else {
    api.sendMessage(
      'Error retrieving package information.',
      event.threadID,
      event.messageID
    );
  }
}

module.exports = adminops;
