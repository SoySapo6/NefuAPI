const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');
const si = require('systeminformation');
const axios = require('axios');

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
  const ip = req.ip.replace('::ffff:', '');
  const today = new Date().toISOString().split('T')[0];
  if (!userRequests[ip]) userRequests[ip] = { date: today, count: 0 };
  if (userRequests[ip].date !== today) {
    userRequests[ip].date = today;
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

let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');
fs.readdirSync(apiFolder).forEach((subfolder) => {
  const subfolderPath = path.join(apiFolder, subfolder);
  if (fs.statSync(subfolderPath).isDirectory()) {
    fs.readdirSync(subfolderPath).forEach((file) => {
      const filePath = path.join(subfolderPath, file);
      if (path.extname(file) === '.js') {
        require(filePath)(app);
        totalRoutes++;
        console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${path.basename(file)} `));
      }
    });
  }
});

console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

app.get('/status', async (req, res) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip.replace('::ffff:', '');
  const uptimeSec = ((Date.now() - apiStartTime) / 1000).toFixed(0);

  let geo = {};
  try {
    const { data } = await axios.get(`https://ipwho.is/${ip}`);
    geo = {
      ip: data.ip,
      country: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id,
      isp: data.connection?.isp,
      continent: data.continent,
      currency: data.currency?.code
    };
  } catch {
    geo = { error: true };
  }

  const mem = await si.mem();
  const cpu = await si.cpu();
  const osInfo = await si.osInfo();
  const disk = await si.fsSize();
  const temp = await si.cpuTemperature();

  const sys = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    distro: osInfo.distro,
    release: osInfo.release,
    kernel: osInfo.kernel,
    uptime_seconds: os.uptime(),
    cpu_model: cpu.manufacturer + ' ' + cpu.brand,
    cores: cpu.cores,
    cpu_speed_ghz: cpu.speed,
    cpu_temperature_celsius: temp.main || 0,
    ram_total_gb: (mem.total / 1024 / 1024 / 1024).toFixed(2),
    ram_used_gb: ((mem.total - mem.available) / 1024 / 1024 / 1024).toFixed(2),
    ram_free_gb: (mem.available / 1024 / 1024 / 1024).toFixed(2),
    disk_total_gb: (disk[0]?.size / 1024 / 1024 / 1024).toFixed(2),
    disk_used_gb: (disk[0]?.used / 1024 / 1024 / 1024).toFixed(2),
    disk_free_gb: (disk[0]?.available / 1024 / 1024 / 1024).toFixed(2),
    cpu_usage_percent: (await si.currentLoad()).currentload.toFixed(2)
  };

  const latency = (Date.now() - start).toFixed(2);

  res.json({
    creator: settings.apiSettings.creator,
    uptime_seconds: uptimeSec,
    total_requests: requestCount,
    routes_loaded: totalRoutes,
    daily_limit: settings.apiSettings.limit,
    active_users: Object.keys(userRequests).length,
    current_date: new Date().toISOString(),
    user_ip: ip,
    user_geo: geo,
    system: sys,
    api_latency_ms: latency
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

app.use((req, res) => {
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
