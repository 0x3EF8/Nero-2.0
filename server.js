const fs = require('fs').promises;
const express = require('express');
const ejs = require('ejs');
const path = require('path');
const moment = require('moment-timezone');
const chalk = require('chalk');
const markdownIt = require('markdown-it')();
const statusMonitor = require('express-status-monitor');
const appstateHandler = require('./src/api/fbstateApi');

const app = express();
const appPort = process.env.APP_PORT || 3000;

app.use(
  statusMonitor({
    title: 'Professional Express Status',
    path: '/status',
    spans: [
      { interval: 1, retention: 60 },
      { interval: 5, retention: 60 },
      { interval: 15, retention: 60 }
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      eventLoop: true,
      heap: true,
      responseTime: true,
      rps: true,
      statusCodes: true
    }
  })
);

const formatUptime = (uptimeInSeconds) => {
  const hours = Math.floor(uptimeInSeconds / 3600);
  const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeInSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

app.get('/', async (req, res) => {
  const html = await ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), {});
  res.send(html);
});

app.get('/README.md', async (req, res) => {
  try {
    const readmeContent = await fs.readFile(path.join(__dirname, 'docs', 'README.md'), 'utf8');
    const htmlContent = markdownIt.render(readmeContent);
    res.type('text/html').send(htmlContent);
  } catch (err) {
    res.status(404).send('README.md not found');
  }
});

app.get('/getfbstate', async (req, res) => {
  const html = await ejs.renderFile(path.join(__dirname, 'views', 'appstateget.ejs'), {});
  res.send(html);
});

app.get('/api/appstate', appstateHandler);

app.get('/health', (req, res) => {
  const uptime = formatUptime(process.uptime());
  const timestamp = new Date().toLocaleString();

  res.json({
    status: 'ok',
    uptime: uptime,
    message: 'Server is running smoothly',
    timestamp: timestamp,
  });
});

moment.tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');

const startServer = (port) => {
  app.listen(port, () => {
    const formattedTime = moment.tz('Asia/Manila').format('MM/DD/YY hh:mm A');
    console.log(
      chalk.cyan(`[SYSTEM] Status: ONLINE\n[NETWORK] Running on PORT: ${port}`)
    );
    console.log(chalk.green(`[TIME] Server initiated at: ${formattedTime}`));
    console.log(`Express status monitor available at http://localhost:${port}/status`);
    console.log(`Health check available at http://localhost:${port}/health`);
  });
};

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
    startServer(availablePort);
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
  });
