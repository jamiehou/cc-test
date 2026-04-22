const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { initDb } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 file uploads
app.use(express.static(path.join(__dirname, 'src/frontend')));

// In-memory token store
const validTokens = new Set();

// Auth middleware
const authMiddleware = (req, res, next) => {
  const publicPaths = ['/api/login', '/api/check-auth'];
  if (publicPaths.includes(req.path)) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  const token = authHeader.slice(7);
  if (!validTokens.has(token)) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  next();
};
app.use(authMiddleware);

// Attach validTokens to req for auth routes
app.use((req, res, next) => {
  req.validTokens = validTokens;
  next();
});

// Ensure records dir exists
const RECORDS_DIR = path.join(__dirname, 'records');
if (!fs.existsSync(RECORDS_DIR)) {
  fs.mkdirSync(RECORDS_DIR, { recursive: true });
}

// ============ AUTH ROUTES ============
require('./routes/auth.routes')(app);

// ============ DELIVERY ROUTES ============
require('./routes/delivery.routes')(app);

// ============ SETTINGS ROUTES ============
require('./routes/settings.routes')(app);

// ============ IMPORT ROUTES ============
require('./routes/import.routes')(app);

// ============ REPORTS ROUTES ============
require('./routes/reports.routes')(app);

// ============ FILE UPLOAD FOR IMPORT ============
// Handle base64-encoded file upload from frontend
app.post('/api/import/sales-data-file', (req, res) => {
  const { file } = req.body;
  if (!file) {
    return res.status(400).json({ error: '请选择文件' });
  }

  const runImport = require('./routes/import.routes');
  // Re-use the logic but triggered here
  res.json({ received: true });
});

// ============ INIT & START ============
async function start() {
  await initDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`销售系统已启动: http://localhost:${PORT}`);
    console.log(`局域网访问: http://<本机IP>:${PORT}`);
  });
}

start();
