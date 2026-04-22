const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const PRODUCT_TYPES_FILE = path.join(__dirname, '..', 'data', 'product_types.json');

function readProductTypes() {
  if (!fs.existsSync(PRODUCT_TYPES_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(PRODUCT_TYPES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeProductTypes(types) {
  fs.writeFileSync(PRODUCT_TYPES_FILE, JSON.stringify(types, null, 2), 'utf-8');
}

module.exports = (app) => {
  // GET /api/settings/product-types
  app.get('/api/settings/product-types', (req, res) => {
    try {
      const types = readProductTypes();
      res.json({ productTypes: types });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/settings/product-types
  app.post('/api/settings/product-types', (req, res) => {
    try {
      const { id, label } = req.body;
      if (!id || !label) {
        return res.status(400).json({ error: 'id 和 label 不能为空' });
      }
      const types = readProductTypes();
      if (types.find(t => t.id === id)) {
        return res.status(400).json({ error: '该产品类型 ID 已存在' });
      }
      types.push({ id, label });
      writeProductTypes(types);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/settings/product-types/:id
  app.put('/api/settings/product-types/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { label } = req.body;
      if (!label) {
        return res.status(400).json({ error: 'label 不能为空' });
      }
      const types = readProductTypes();
      const idx = types.findIndex(t => t.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: '产品类型不存在' });
      }
      types[idx].label = label;
      writeProductTypes(types);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/settings/product-types/:id
  app.delete('/api/settings/product-types/:id', (req, res) => {
    try {
      const { id } = req.params;
      const types = readProductTypes();
      const filtered = types.filter(t => t.id !== id);
      if (filtered.length === types.length) {
        return res.status(404).json({ error: '产品类型不存在' });
      }
      writeProductTypes(filtered);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
