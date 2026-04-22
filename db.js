const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'data', 'sales.db');

let db = null;

async function initDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE);
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE sales_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT,
        distributor TEXT,
        end_user TEXT,
        product TEXT,
        total_amount REAL,
        invoice_date TEXT,
        imported_at TEXT
      )
    `);
    db.run(`CREATE INDEX idx_year ON sales_data(invoice_date)`);
    db.run(`CREATE INDEX idx_dist ON sales_data(distributor)`);
    saveDb();
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  }
}

function getDb() {
  return db;
}

module.exports = { initDb, saveDb, getDb };
