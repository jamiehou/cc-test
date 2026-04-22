const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { getDb, saveDb } = require('../db');

const REQUIRED_COLUMNS = [
  { col: 'A', name: 'Country/Area', key: 'country' },
  { col: 'B', name: 'Distributor', key: 'distributor' },
  { col: 'E', name: 'End User Company Name', key: 'end_user' },
  { col: 'H', name: 'Product', key: 'product' },
  { col: 'M', name: 'Total amount', key: 'total_amount' },
  { col: 'N', name: 'Invoice date', key: 'invoice_date' },
];

module.exports = (app) => {
  app.post('/api/import/sales-data', async (req, res) => {
    try {
      // File is sent as base64 in req.body.file (JSON upload from frontend FormData converted)
      const { file } = req.body;
      if (!file) {
        return res.status(400).json({ error: '请选择文件' });
      }

      // Decode base64 to buffer
      const buffer = Buffer.from(file, 'base64');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet(1);

      // Validate headers in row 1
      const headerRow = sheet.getRow(1);
      const headerMap = {};
      headerRow.eachCell((cell, colNumber) => {
        const colLetter = String.fromCharCode(64 + colNumber);
        headerMap[colLetter] = cell.value;
      });

      // Check required columns
      const missing = [];
      for (const reqCol of REQUIRED_COLUMNS) {
        const headerVal = headerMap[reqCol.col];
        if (!headerVal || !headerVal.toString().trim()) {
          missing.push(`${reqCol.col}: ${reqCol.name}`);
        }
      }
      if (missing.length > 0) {
        return res.status(400).json({ error: `数据源格式错误，缺少以下列：${missing.join(', ')}` });
      }

      // Clear existing data
      const db = getDb();
      db.run(`DELETE FROM sales_data`);

      // Read data rows
      let rowCount = 0;
      const importedAt = new Date().toISOString();

      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // Skip header

        const getCellValue = (col) => {
          const val = row.getCell(col).value;
          if (val === undefined || val === null) return '';
          // Handle RichText
          if (typeof val === 'object' && val.richText) {
            return val.richText.map(t => t.text).join('');
          }
          // Handle Excel formula cells (e.g. { formula: 'K3*L3', result: 1200 })
          if (typeof val === 'object' && 'result' in val) {
            return String(val.result);
          }
          // Handle Excel date values (stored as Date objects in ExcelJS)
          if (val instanceof Date) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          return String(val).trim();
        };

        const country = getCellValue('A');
        const distributor = getCellValue('B');
        const endUser = getCellValue('E');
        const product = getCellValue('H');
        const totalAmount = parseFloat(getCellValue('M')) || 0;
        const invoiceDate = getCellValue('N');

        if (!distributor && !product) return; // Skip empty rows
        if (!invoiceDate) return; // Skip rows without invoice date

        if (!distributor && !product) return; // Skip empty rows

        db.run(
          `INSERT INTO sales_data (country, distributor, end_user, product, total_amount, invoice_date, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [country, distributor, endUser, product, totalAmount, invoiceDate, importedAt]
        );
        rowCount++;
      });

      saveDb();
      res.json({ ok: true, rowCount });
    } catch (err) {
      res.status(500).json({ error: '导入失败: ' + err.message });
    }
  });
};
