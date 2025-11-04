const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const fetch = require('node-fetch'); // you need npm install node-fetch
const disk = require('diskusage'); // you need npm install diskusage

const app = express();
const PORT = process.env.PORT || 10005;

app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/src', express.static(path.join(__dirname, 'src')));

const settingsPath = path.join(__dirname, './src/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

let requestCount = 0;
const apiStartTime = Date.now();
const userRequests = {};

app.use((req, res, next) => {
  const ip = req.ip;
  const currentDate = new Date().toISOString().split('T')[0];
  if (!userRequests[ip]) userRequests[ip] = {};
  if (userRequests[ip].date !== currentDate) {
    userRequests[ip].date = currentDate;
    userRequests[ip].count = 0;
  }
  if (userRequests[ip].count >= parseInt(settings.apiSettings.limit)) {
    return res.status(429).json({
      status: 429,
      message: "Daily request limit reached",
      creator: settings.apiSettings.creator
    });
  }
  userRequests[ip].count++;
  requestCount++;
  next();
});

app.use((req, res, next) => {
  const startTime = process.hrtime();
  const originalJson = res.json;
  res.json = function(data) {
    const diff = process.hrtime(startTime);
    const latencyMs = diff[0] * 1000 + diff[1] / 1e6;
    if (data && typeof data === 'object') {
      data.api_latency_ms = latencyMs.toFixed(3);
    }
    return originalJson.call(this, data);
  };
  next();
});

app.get('/status', async (req, res) => {
  try {
    const ip = req.ip;
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`); // example geo API
    const geo = await geoRes.json().catch(() => ({}));

    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cores = cpus.length;
    const speed = cpus[0].speed;
    const totalRam = os.totalmem();
    const freeRam = os.freemem();

    let diskInfo = {};
    try {
      const { available, free, total } = await disk.check(os.platform() === 'win32' ? 'c:' : '/');
      diskInfo = { total, free, available };
    } catch (err) {
      diskInfo = { error: "disk usage not available" };
    }

    let temp = "not available";
    if (os.platform() === 'linux') {
      try {
        const out = await new Promise((resolve, reject) => {
          exec("cat /sys/class/thermal/thermal_zone0/temp", (err, stdout) => {
            if (err) return reject(err);
            resolve(stdout);
          });
        });
        temp = (parseInt(out) / 1000) + "°C";
      } catch(e) {
        temp = "error reading temperature";
      }
    }

    const uptimeSeconds = (Date.now() - apiStartTime) / 1000;

    res.json({
      creator: settings.apiSettings.creator,
      uptime_seconds: uptimeSeconds.toFixed(0),
      total_requests: requestCount,
      routes_loaded: Object.keys(require.cache).length, // or your totalRoutes variable
      daily_limit: settings.apiSettings.limit,
      active_users: Object.keys(userRequests).length,
      current_date: new Date().toISOString(),

      user_ip: ip,
      user_geo: geo,

      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpu_model: cpuModel,
        cores: cores,
        cpu_speed_mhz: speed,
        ram_total_bytes: totalRam,
        ram_free_bytes: freeRam,
        disk: diskInfo,
        cpu_temperature: temp
      }
    });
  } catch(e) {
    res.status(500).json({ status: 500, message: "Error gathering status data", error: e.toString() });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

app.use((req, res, next) => {
  res.status(404).sendFile(process.cwd() + "/api-page/404.html");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(process.cwd() + "/api-page/500.html");
});

app.listen(PORT, () => {
  console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Server is running on port ${PORT} `));
});

module.exports = app;
