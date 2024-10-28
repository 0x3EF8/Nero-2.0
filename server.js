const fs = require('fs').promises;
const express = require('express');
const ejs = require('ejs');
const path = require('path');
const moment = require('moment-timezone');
const chalk = require('chalk');
const markdownIt = require('markdown-it')();
const statusMonitor = require('express-status-monitor');
const appstateHandler = require('./src/api/fbstateApi');
const cookiesExtractorHandler = require('./src/api/cookiesExtractor');

const app = express();
const appPort = process.env.APP_PORT || 6057;

app.use(express.json());

app.use(
  statusMonitor({
    title: 'System Status',
    path: '/status',
    spans: [
      { interval: 1, retention: 60 },
      { interval: 5, retention: 60 },
      { interval: 15, retention: 60 },
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      eventLoop: true,
      heap: true,
      responseTime: true,
      rps: true,
      statusCodes: true,
    },
  })
);

app.get('/', async (req, res) => {
  const html = await ejs.renderFile(
    path.join(__dirname, 'views', 'index.ejs'),
    {}
  );
  res.send(html);
});

app.get('/README.md', async (req, res) => {
  try {
    const readmeContent = await fs.readFile(
      path.join(__dirname, 'docs', 'README.md'),
      'utf8'
    );
    const htmlContent = markdownIt.render(readmeContent);
    res.type('text/html').send(htmlContent);
  } catch (err) {
    res.status(404).send('README.md not found');
  }
});

app.get('/api/appstate', appstateHandler);

app.post('/api/extract-cookies', cookiesExtractorHandler);

app.get('/health', (req, res) => {
  const uptime = moment.duration(process.uptime(), 'seconds').humanize();
  const timestamp = new Date().toLocaleString();

  res.json({
    status: 'ok',
    uptime: uptime,
    message: 'Server is running smoothly',
    timestamp: timestamp,
  });
});

moment.tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');

const findAvailablePort = (port) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      server.close();
      resolve(port);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(port + 1));
      } else {
        reject(err);
      }
    });
  });
};

findAvailablePort(appPort)
  .then((availablePort) => {
    app.listen(availablePort, () => {
      console.log(`Server is running on port ${availablePort}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
  });
