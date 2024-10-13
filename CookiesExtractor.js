/**
 * BETA TESTING NOTICE
 * 
 * This script is designed to automate the login process to Facebook and retrieve session cookies using Puppeteer.
 * It prompts the user for Facebook credentials, logs in, and saves the session cookies to a file.
 * 
 * Please note:
 * - This script is currently in **BETA** and is intended for testing purposes only.
 * - It has not been optimized or fully tested for production environments.
 * - Use at your own risk, as Facebook's security protocols and policies may change.
 * - Ensure compliance with Facebook's terms of service and local regulations regarding automation and data usage.
 * 
 * Disclaimer:
 * The developer assumes no responsibility for misuse or any consequences resulting from the use of this script.
 * Always handle sensitive data, such as credentials, with care.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const readlineSync = require('readline-sync');

(async () => {
  const USERNAME = readlineSync.question('Enter your Facebook username: ');
  const PASSWORD = readlineSync.question('Enter your Facebook password: ', {
    hideEchoBack: true,
  });

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
  );

  await page.goto('https://www.facebook.com/');

  await page.type('#email', USERNAME);
  await page.type('#pass', PASSWORD);

  await page.waitForSelector('button[name="login"]', { visible: true });
  await page.click('button[name="login"]');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  const cookies = await page.cookies();

  console.log('Cookies:', JSON.stringify(cookies, null, 2));

  fs.writeFileSync('pat.env', JSON.stringify(cookies, null, 2));

  await browser.close();
})();