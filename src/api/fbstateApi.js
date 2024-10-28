const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const appStateDirectory = path.join(__dirname, '..', 'data', 'secrets');
const requiredCookieKeys = [
  'key',
  'value',
  'domain',
  'path',
  'hostOnly',
  'creation',
  'lastAccessed',
];

function isValidCookieStructure(cookie) {
  return requiredCookieKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(cookie, key)
  );
}

function getExistingAppStateValues() {
  return fs.readdirSync(appStateDirectory).flatMap((fileName) => {
    const filePath = path.join(appStateDirectory, fileName);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileAppState = JSON.parse(fileContent);
      return fileAppState;
    } catch (error) {
      console.error(`Error parsing JSON in file ${filePath}: ${error}`);
      return [];
    }
  });
}

function isDuplicateCookie(newCookies, existingCookies) {
  return newCookies.some((newCookie) =>
    existingCookies.some((existingCookie) =>
      requiredCookieKeys.every(
        (key) => newCookie[key] === existingCookie[key]
      )
    )
  );
}

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    try {
      fs.mkdirSync(directoryPath, { recursive: true });
      console.log(chalk.cyan(`Directory created: ${directoryPath}`));
    } catch (err) {
      console.error(
        chalk.red(`Error creating directory: ${directoryPath}`),
        err
      );
    }
  } else {
    checkForCredentials(directoryPath);
  }
}

function checkForCredentials(directoryPath) {
  const files = fs.readdirSync(directoryPath);
  const jsonFiles = files.filter((file) => path.extname(file) === '.env');

  if (jsonFiles.length > 0) {
    console.log(
      chalk.cyan(
        `[COOKIES] Credentials Check: Available! (${jsonFiles.length})`
      )
    );
  } else {
    console.log(chalk.yellow('[COOKIES] Credentials Check: Not found.'));
  }
}

async function appstateHandler(req, res) {
  ensureDirectoryExists(appStateDirectory);

  let cookies;

  if (req.query.cookies) {
    cookies = req.query.cookies;
  }

  if (!cookies && req.body.cookies) {
    cookies = req.body.cookies;
  }

  if (!cookies) {
    return res
      .status(400)
      .json({ error: 'The "cookies" parameter is required.' });
  }

  let appStateData;

  try {
    appStateData = JSON.parse(cookies.replace(/\\/g, ''));
    if (
      !Array.isArray(appStateData) ||
      appStateData.some((cookie) => !isValidCookieStructure(cookie))
    ) {
      return res.status(400).json({
        error:
          'Invalid "cookies". It should be an array of objects with the correct structure.',
      });
    }
  } catch (error) {
    return res
      .status(400)
      .json({ error: 'Invalid JSON in "cookies" parameter.' });
  }

  const existingAppStateValues = getExistingAppStateValues();

  if (isDuplicateCookie(appStateData, existingAppStateValues)) {
    return res.status(400).json({
      error:
        'Duplicate cookies detected. Please ensure each appstate is unique.',
    });
  }

  const fbUID = appStateData.find((cookie) => cookie.key === 'c_user')?.value;
  if (!fbUID) {
    return res.status(400).json({ error: 'Missing c_user cookie.' });
  }

  const fileName = `${fbUID}.env`;
  const filePath = path.join(appStateDirectory, fileName);

  try {
    fs.writeFileSync(filePath, JSON.stringify(appStateData, null, 2));
    res
      .status(200)
      .json({ message: 'AppState saved successfully.', name: fbUID });
    console.log(chalk.green(`New AppState saved: ${fileName}`));
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Error while saving the app state: ${error.message}` });
  }
}

module.exports = appstateHandler;
