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

app.use(async (req, res, next) => {
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

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status,
                creator: settings.apiSettings.creator || "SoyMaycol",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
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
    const uptime = ((Date.now() - apiStartTime) / 1000).toFixed(0);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    let geo = {};
    try {
        const ipData = await axios.get(`https://ipapi.co/${ip}/json/`);
        geo = ipData.data;
    } catch (e) {
        geo = { error: "Geo data unavailable" };
    }

    const cpuInfo = os.cpus()[0];
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    const disk = fs.statSync("/");
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();

    res.json({
        creator: settings.apiSettings.creator,
        uptime: `${uptime}s`,
        total_requests: requestCount,
        routes_loaded: totalRoutes,
        daily_limit: settings.apiSettings.limit,
        active_users: Object.keys(userRequests).length,
        current_date: new Date().toISOString(),
        user_ip: ip,
        user_geo: geo,
        system: {
            hostname,
            platform,
            arch,
            cpu: cpuInfo.model,
            cores: os.cpus().length,
            cpu_speed: `${cpuInfo.speed} MHz`,
            ram_total_gb: totalMem,
            ram_used_gb: usedMem,
            ram_free_gb: freeMem,
            uptime_os_seconds: os.uptime()
        }
    });
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
