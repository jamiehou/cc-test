const { getDb } = require('../db');

function classifyRevenue(product) {
  if (!product) return null;
  if (product.includes('WPS Office For Business')) return '授权收入';
  if (product.includes('WPS Pro for Team')) return '团队订阅收入';
  if (product.includes('WPS Pro')) return '会员收入';
  return null;
}

module.exports = (app) => {
  // GET /api/reports/sales-data
  app.get('/api/reports/sales-data', (req, res) => {
    try {
      const { year, distributor, productType } = req.query;
      const db = getDb();

      let sql = `SELECT country, distributor, end_user, product, total_amount, invoice_date FROM sales_data WHERE 1=1`;
      const params = [];

      if (year) {
        sql += ` AND invoice_date LIKE ?`;
        params.push(`${year}-%`);
      }
      if (distributor) {
        sql += ` AND distributor = ?`;
        params.push(distributor);
      }
      if (productType) {
        sql += ` AND product LIKE ?`;
        params.push(`%${productType}%`);
      }

      sql += ` ORDER BY invoice_date`;

      const stmt = db.prepare(sql);
      if (params.length > 0) stmt.bind(params);

      const data = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        row.month = row.invoice_date ? parseInt(row.invoice_date.split('-')[1], 10) : null;
        row.revenueType = classifyRevenue(row.product);
        data.push(row);
      }
      stmt.free();

      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/reports/years
  app.get('/api/reports/years', (req, res) => {
    try {
      const db = getDb();
      const results = db.exec(`SELECT DISTINCT substr(invoice_date, 1, 4) as year FROM sales_data WHERE invoice_date IS NOT NULL AND invoice_date != '' ORDER BY year DESC`);
      const years = results.length > 0 ? results[0].values.map(v => v[0]) : [];
      res.json({ years });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/reports/distributors
  app.get('/api/reports/distributors', (req, res) => {
    try {
      const db = getDb();
      const results = db.exec(`SELECT DISTINCT distributor FROM sales_data WHERE distributor IS NOT NULL AND distributor != '' ORDER BY distributor`);
      const distributors = results.length > 0 ? results[0].values.map(v => v[0]) : [];
      res.json({ distributors });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/reports/product-types
  app.get('/api/reports/product-types', (req, res) => {
    try {
      const db = getDb();
      const results = db.exec(`SELECT DISTINCT product FROM sales_data WHERE product IS NOT NULL AND product != '' ORDER BY product`);
      const productTypes = results.length > 0 ? results[0].values.map(v => v[0]) : [];
      res.json({ productTypes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/reports/sales-summary
  app.get('/api/reports/sales-summary', (req, res) => {
    try {
      const { year, distributor, productType } = req.query;
      const db = getDb();

      let sql = `SELECT country, distributor, end_user, product, total_amount, invoice_date FROM sales_data WHERE 1=1`;
      const params = [];

      if (year) {
        sql += ` AND invoice_date LIKE ?`;
        params.push(`${year}-%`);
      }
      if (distributor) {
        sql += ` AND distributor = ?`;
        params.push(distributor);
      }
      if (productType) {
        sql += ` AND product LIKE ?`;
        params.push(`%${productType}%`);
      }

      const stmt = db.prepare(sql);
      if (params.length > 0) stmt.bind(params);

      // Build monthly cross-tab
      const monthlyData = {};
      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = { 授权收入: 0, 会员收入: 0, 团队订阅收入: 0 };
      }

      while (stmt.step()) {
        const row = stmt.getAsObject();
        if (!row.invoice_date) continue;
        const month = parseInt(row.invoice_date.split('-')[1], 10);
        const revType = classifyRevenue(row.product);
        if (revType && monthlyData[month]) {
          monthlyData[month][revType] += row.total_amount || 0;
        }
      }
      stmt.free();

      // Calculate totals
      const totals = { 授权收入: 0, 会员收入: 0, 团队订阅收入: 0 };
      for (let m = 1; m <= 12; m++) {
        totals.授权收入 += monthlyData[m].授权收入;
        totals.会员收入 += monthlyData[m].会员收入;
        totals.团队订阅收入 += monthlyData[m].团队订阅收入;
      }

      res.json({ monthlyData, totals });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
