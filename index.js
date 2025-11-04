const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');
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
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
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
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  let geo = {};
  try {
    const response = await axios.get(`https://ipapi.co/${ip.replace('::ffff:', '')}/json/`);
    geo = response.data;
  } catch {
    geo = { error: true, message: "Could not fetch geolocation" };
  }

  const uptime = ((Date.now() - apiStartTime) / 1000).toFixed(0);
  const totalMem = os.totalmem() / 1024 / 1024 / 1024;
  const freeMem = os.freemem() / 1024 / 1024 / 1024;
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || "Unknown";
  const cpuSpeed = cpus[0]?.speed || 0;
  const cpuUsage = (os.loadavg()[0] / os.cpus().length * 100).toFixed(2);

  const disks = fs.existsSync('/proc/mounts') ? fs.readFileSync('/proc/mounts', 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => line.split(' ')[1])
    .filter(p => p.startsWith('/'))
    : [];

  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    os_release: os.release(),
    node_version: process.version,
    cpu_model: cpuModel,
    cpu_speed_mhz: cpuSpeed,
    cpu_cores: cpus.length,
    cpu_load_percent: `${cpuUsage}%`,
    ram_total_gb: totalMem.toFixed(2),
    ram_used_gb: usedMem.toFixed(2),
    ram_free_gb: freeMem.toFixed(2),
    uptime_os_seconds: os.uptime(),
    home_dir: os.homedir(),
    temp_dir: os.tmpdir(),
    load_average: os.loadavg(),
    network_interfaces: os.networkInterfaces(),
    mounted_drives: disks
  };

  const processInfo = {
    pid: process.pid,
    uptime_seconds: process.uptime().toFixed(0),
    memory_mb: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
    node_exec_path: process.execPath,
    cwd: process.cwd(),
    platform: process.platform,
    argv: process.argv,
    env_vars_count: Object.keys(process.env).length
  };

  const response = {
    status: 200,
    creator: settings.apiSettings.creator,
    api_uptime_seconds: uptime,
    total_requests: requestCount,
    routes_loaded: totalRoutes,
    daily_limit: settings.apiSettings.limit,
    active_users: Object.keys(userRequests).length,
    current_date: new Date().toISOString(),
    user_info: {
      ip,
      geo
    },
    system_info: systemInfo,
    process_info: processInfo
  };

  res.json(response);
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
