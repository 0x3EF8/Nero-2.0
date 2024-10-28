const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ConfigManager {
  constructor() {
    this.configs = {
      exceptionList: null,
      settings: null,
      rolesConfig: null,
    };
    this.listeners = new Map();
  }

  loadConfig(configPath) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(
        chalk.red(`Error reading config file ${configPath}:`, error)
      );
      return null;
    }
  }

  getChangedProperties(oldObj, newObj, parentKey = '') {
    const changes = [];
    for (const [key, value] of Object.entries(newObj)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        changes.push(
          ...this.getChangedProperties(oldObj[key] || {}, value, fullKey)
        );
      } else if (oldObj[key] !== value) {
        changes.push({ key: fullKey, oldValue: oldObj[key], newValue: value });
      }
    }
    return changes;
  }

  watchJsonFile(filePath, configKey) {
    fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        console.log(chalk.green(`File changed: ${filePath}`));
        try {
          const updatedData = this.loadConfig(filePath);
          if (updatedData) {
            const changes = this.getChangedProperties(
              this.configs[configKey],
              updatedData
            );
            if (changes.length > 0) {
              console.log(
                chalk.blue(`Config updated: ${path.basename(filePath)}`)
              );
              changes.forEach(({ key, oldValue, newValue }) => {
                console.log(chalk.cyan(`  ${key}: ${oldValue} => ${newValue}`));
              });
            }
            this.configs[configKey] = updatedData;
            this.emit('configUpdated', configKey, updatedData);
          }
        } catch (error) {
          console.error(
            chalk.red(
              `Error reading or parsing updated file ${filePath}:`,
              error
            )
          );
        }
      }
    });
  }

  initializeConfigs() {
    const configDir = path.join(__dirname, '..', 'config');
    const exceptionListPath = path.join(configDir, 'restricted_access.json');
    const settingsPath = path.join(configDir, 'settings.json');
    const rolesConfigPath = path.join(configDir, 'roles.json');

    this.configs.exceptionList = this.loadConfig(exceptionListPath) || {
      bots: [],
      users: [],
      threads: [],
    };
    this.configs.settings = this.loadConfig(settingsPath) || [{}];
    this.configs.rolesConfig = this.loadConfig(rolesConfigPath) || {};

    this.watchJsonFile(settingsPath, 'settings');
    this.watchJsonFile(exceptionListPath, 'exceptionList');
    this.watchJsonFile(rolesConfigPath, 'rolesConfig');

    return this.configs;
  }

  getConfigs() {
    return this.configs;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(...args));
    }
  }
}

const configManager = new ConfigManager();

module.exports = { configManager };
