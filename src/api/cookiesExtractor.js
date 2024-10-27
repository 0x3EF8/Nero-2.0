const puppeteer = require('puppeteer');

async function extractCookies(username, password) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
  );

  await page.goto('https://www.facebook.com/');

  await page.type('#email', username);
  await page.type('#pass', password);

  await page.waitForSelector('button[name="login"]', { visible: true });
  await page.click('button[name="login"]');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  const cookies = await page.cookies();

  await browser.close();

  return cookies;
}

async function cookiesExtractorHandler(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const cookies = await extractCookies(username, password);
    res.json({ cookies });
  } catch (error) {
    console.error('Error extracting cookies:', error);
    res.status(500).json({ error: 'An error occurred while extracting cookies.' });
  }
}

module.exports = cookiesExtractorHandler;
