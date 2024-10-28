const puppeteer = require('puppeteer');

async function extractCookies(username, password, maxRetries = 3) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
    );

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });

      await page.type('#email', username);
      await page.type('#pass', password);

      await Promise.all([
        page.click('button[name="login"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);

      await new Promise(resolve => setTimeout(resolve, 10000));

      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('[aria-label="Home"]') || !!document.querySelector('[data-testid="royal_login_button"]');
      });

      if (!isLoggedIn) {
        console.log(`Login attempt ${attempt + 1} failed. Retrying...`);
        continue;
      }

      const allCookies = await page.cookies();
      console.log('All cookies:', JSON.stringify(allCookies, null, 2));

      const desiredCookies = ['datr', 'sb', 'ps_l', 'ps_n', 'wd', 'c_user', 'xs', 'fr'];

      const formattedCookies = desiredCookies.map(cookieName => {
        const cookie = allCookies.find(c => c.name === cookieName);
        if (cookie) {
          return {
            key: cookie.name,
            value: cookie.value,
            domain: cookie.domain.replace(/^\./, ''),
            path: cookie.path,
            hostOnly: !cookie.domain.startsWith('.'),
            creation: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
          };
        }
        return null;
      }).filter(cookie => cookie !== null);

      if (formattedCookies.some(cookie => cookie.key === 'c_user')) {
        return formattedCookies;
      }

      console.log(`c_user cookie not found in attempt ${attempt + 1}. Retrying...`);
    }

    throw new Error('Failed to retrieve c_user cookie after multiple attempts. This could be due to wrong credentials, or Facebook might have changed their login process or cookie structure.');
  } catch (error) {
    throw error;
  } finally {
    await browser.close();
  }
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
    res.status(500).json({ error: error.message || 'An error occurred while extracting cookies.' });
  }
}

module.exports = cookiesExtractorHandler;
