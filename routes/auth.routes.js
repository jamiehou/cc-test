const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const USER_EXCEL = path.join(__dirname, '..', 'src/templates/input/User.xlsx');

module.exports = (app) => {
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }
    try {
      if (!fs.existsSync(USER_EXCEL)) {
        return res.status(500).json({ error: '用户配置文件不存在' });
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(USER_EXCEL);
      const sheet = workbook.getWorksheet(1);

      let found = false;
      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const userCell = row.getCell(1);
        const passCell = row.getCell(2);
        let userVal = userCell.value;
        let passVal = passCell.value;
        if (userCell.type === ExcelJS.ValueType.RichText) {
          userVal = userVal.richText.map(t => t.text).join('');
        }
        if (passCell.type === ExcelJS.ValueType.RichText) {
          passVal = passVal.richText.map(t => t.text).join('');
        }
        if (String(userVal).trim() === username && String(passVal).trim() === password) {
          found = true;
        }
      });

      if (!found) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      req.validTokens.add(token);

      res.json({ ok: true, token, username });
    } catch (err) {
      res.status(500).json({ error: '登录失败: ' + err.message });
    }
  });

  app.get('/api/check-auth', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ ok: false });
    }
    const token = authHeader.slice(7);
    if (req.validTokens.has(token)) {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const username = decoded.split(':')[0];
      res.json({ ok: true, username });
    } else {
      res.json({ ok: false });
    }
  });

  app.post('/api/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      req.validTokens.delete(authHeader.slice(7));
    }
    res.json({ ok: true });
  });
};
