const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const ExcelJS = require('exceljs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const RECORDS_DIR = path.join(__dirname, '..', 'records');
const EXCEL_TEMPLATE = path.join(__dirname, '..', 'src/templates/order/report_template.xlsx');
const EXCEL_OUTPUT = path.join(RECORDS_DIR, 'delivery_records.xlsx');
const CERT_TEMPLATE_BUSINESS_RENTAL = path.join(__dirname, '..', 'src/templates/cert/certl_template - business_rental.docx');
const CERT_TEMPLATE_BUSINESS_LIFETIME = path.join(__dirname, '..', 'src/templates/cert/certl_template - business_lifetime.docx');
const CERT_TEMPLATE_WPSPRO_RENTAL = path.join(__dirname, '..', 'src/templates/cert/certl_template - wpspro_rental.docx');
const CERT_TEMPLATE_OTHERS = path.join(__dirname, '..', 'src/templates/cert/certl_template - others_rental.docx');
const EMAIL_TEMPLATE = path.join(__dirname, '..', 'src/templates/email/email_template.txt');

function findLibreOffice() {
  const candidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

module.exports = (app) => {
  // GET /api/email-template
  app.get('/api/email-template', (req, res) => {
    try {
      const template = fs.readFileSync(EMAIL_TEMPLATE, 'utf-8');
      res.json({ template });
    } catch (err) {
      res.status(500).json({ error: '读取邮件模板失败', detail: err.message });
    }
  });

  // POST /api/save-record
  app.post('/api/save-record', async (req, res) => {
    const { clientName, quantity, startDate, endDate, activationCode, productType, duration, productTypeLabel } = req.body;
    try {
      const workbook = new ExcelJS.Workbook();
      if (fs.existsSync(EXCEL_OUTPUT)) {
        await workbook.xlsx.readFile(EXCEL_OUTPUT);
      } else {
        await workbook.xlsx.readFile(EXCEL_TEMPLATE);
      }

      const sheet = workbook.worksheets[0];
      const today = new Date().toISOString().slice(0, 10);

      const headerRow = sheet.getRow(1);
      const colMap = {};
      headerRow.eachCell((cell, colNumber) => {
        let headerName = cell.value;
        if (cell.type === ExcelJS.ValueType.RichText) {
          headerName = cell.value.richText.map(t => t.text).join('');
        }
        if (typeof headerName === 'string') headerName = headerName.trim();
        colMap[headerName] = colNumber;
      });

      const newRow = sheet.addRow([]);
      const set = (header, value) => {
        const col = colMap[header];
        if (col) newRow.getCell(col).value = value;
      };
      set('客户名称', clientName);
      set('订单日期', today);
      set('数量', quantity);
      set('激活码', activationCode);

      let activationType = productTypeLabel;
      if (productType === 'business_annual' || productType === 'business_lifetime') {
        activationType = `WPS Office for Business(${duration}Y)`;
      } else if (productType === 'wps_pro_annual') {
        activationType = `WPS Pro(${duration}Y)`;
      }
      set('激活码类型', activationType);

      const licenseType = productType === 'business_lifetime' ? 'Lifetime' : 'Rental';
      set('授权类型', licenseType);
      set('授权期限', duration);

      await workbook.xlsx.writeFile(EXCEL_OUTPUT);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/generate-cert
  app.post('/api/generate-cert', (req, res) => {
    const { clientName, quantity, startDate, endDate, activationCode, productType, duration, afterSalesDeadline, productTypeLabel } = req.body;
    try {
      let certTemplate;
      let docxFileName;
      const dateStr = new Date().toISOString().slice(0, 10);

      if (productType === 'business_annual') {
        certTemplate = CERT_TEMPLATE_BUSINESS_RENTAL;
        docxFileName = `[Business Rental]Kingsoft Certificate ${clientName} - ${dateStr}.docx`;
      } else if (productType === 'business_lifetime') {
        certTemplate = CERT_TEMPLATE_BUSINESS_LIFETIME;
        docxFileName = `[Business Lifetime]Kingsoft Certificate ${clientName} - ${dateStr}.docx`;
      } else if (productType === 'wps_pro_annual') {
        certTemplate = CERT_TEMPLATE_WPSPRO_RENTAL;
        docxFileName = `[WPS Pro]Kingsoft Certificate ${clientName} - ${dateStr}.docx`;
      } else {
        certTemplate = CERT_TEMPLATE_OTHERS;
        docxFileName = `[Others]Kingsoft Certificate ${clientName} - ${dateStr}.docx`;
      }

      const content = fs.readFileSync(certTemplate, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      doc.render({ clientName, quantity, startDate, endDate, activationCode, duration, afterSalesDeadline, productType: productTypeLabel });

      const docxPath = path.join(RECORDS_DIR, docxFileName);
      const buf = doc.getZip().generate({ type: 'nodebuffer' });
      fs.writeFileSync(docxPath, buf);

      const soffice = findLibreOffice();
      if (soffice) {
        const cmd = `"${soffice}" --headless --convert-to pdf --outdir "${RECORDS_DIR}" "${docxPath}"`;
        exec(cmd, (err) => {
          if (err) {
            res.json({ ok: true, path: docxPath, fileName: docxFileName, format: 'docx' });
          } else {
            const pdfFileName = docxFileName.replace('.docx', '.pdf');
            const pdfPath = path.join(RECORDS_DIR, pdfFileName);
            try { fs.unlinkSync(docxPath); } catch (_) {}
            res.json({ ok: true, path: pdfPath, fileName: pdfFileName, format: 'pdf' });
          }
        });
      } else {
        res.json({ ok: true, path: docxPath, fileName: docxFileName, format: 'docx' });
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/open-excel
  app.get('/api/open-excel', (req, res) => {
    if (!fs.existsSync(EXCEL_OUTPUT)) {
      return res.status(404).json({ error: '发货记录文件不存在' });
    }
    exec(`start "" "${EXCEL_OUTPUT}"`);
    res.json({ ok: true });
  });

  // GET /api/download-cert
  app.get('/api/download-cert', (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).json({ error: '缺少文件名参数' });
    const filePath = path.resolve(RECORDS_DIR, path.basename(file));
    if (!filePath.startsWith(path.resolve(RECORDS_DIR))) {
      return res.status(403).json({ error: '非法路径' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    res.download(filePath);
  });
};
