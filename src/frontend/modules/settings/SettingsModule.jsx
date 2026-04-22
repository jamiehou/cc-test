const { useState, useEffect } = React;

function ProductTypeList() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('authToken');
    return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
  };

  function loadTypes() {
    setLoading(true);
    fetch('/api/settings/product-types', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { setTypes(data.productTypes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadTypes(); }, []);

  function handleAdd() {
    if (!newId.trim() || !newLabel.trim()) { setError('ID 和名称不能为空'); return; }
    setError('');
    fetch('/api/settings/product-types', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ id: newId.trim(), label: newLabel.trim() })
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) { loadTypes(); setNewId(''); setNewLabel(''); setShowAdd(false); }
        else setError(data.error || '添加失败');
      })
      .catch(() => setError('添加失败'));
  }

  function handleUpdate(id) {
    if (!editLabel.trim()) { setError('名称不能为空'); return; }
    setError('');
    fetch(`/api/settings/product-types/${id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ label: editLabel.trim() })
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) { loadTypes(); setEditId(null); }
        else setError(data.error || '更新失败');
      })
      .catch(() => setError('更新失败'));
  }

  function handleDelete(id) {
    if (!confirm('确定删除该产品类型？')) return;
    fetch(`/api/settings/product-types/${id}`, { method: 'DELETE', headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (data.ok) loadTypes(); })
      .catch(() => {});
  }

  function startEdit(t) {
    setEditId(t.id);
    setEditLabel(t.label);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>产品类型</h3>
        <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '+ 添加类型'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#f5f5f7', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">类型 ID</label>
              <input className="form-input" placeholder="如 business_annual" value={newId} onChange={e => setNewId(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">显示名称</label>
              <input className="form-input" placeholder="如 WPS Office For Business" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleAdd}>保存</button>
          </div>
          {error && <div className="error-msg" style={{ marginTop: '8px' }}>{error}</div>}
        </div>
      )}

      {error && !showAdd && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>名称</th><th>操作</th></tr>
          </thead>
          <tbody>
            {types.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>
                  {editId === t.id ? (
                    <input className="form-input" value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                  ) : t.label}
                </td>
                <td className="actions">
                  {editId === t.id ? (
                    <>
                      <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleUpdate(t.id)}>保存</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setEditId(null)}>取消</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => startEdit(t)}>编辑</button>
                      <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', color: '#ff3b30' }} onClick={() => handleDelete(t.id)}>删除</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ImportPanel() {
  const [dragover, setDragover] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('authToken');
    return { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
  };

  function handleFile(f) {
    setFile(f);
    setResult(null);
    setError('');
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) handleFile(f);
    else setError('请选择 Excel 文件（.xlsx 或 .xls）');
  }

  function handleFileInput(e) {
    const f = e.target.files[0];
    if (f) handleFile(f);
  }

  function handleImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = btoa(new Uint8Array(e.target.result).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      fetch('/api/import/sales-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ file: base64 })
      })
        .then(r => r.json())
        .then(data => {
          setImporting(false);
          if (data.ok) setResult(`导入成功，共 ${data.rowCount} 条数据`);
          else setError(data.error || '导入失败');
        })
        .catch(err => { setImporting(false); setError('导入失败: ' + err.message); });
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>销售数据导入</h3>
      <p style={{ color: '#6e6e73', fontSize: '14px', marginBottom: '20px' }}>
        上传 Excel 文件导入销售订单数据。格式要求：第一行为表头，A列 Country/Area，B列 Distributor，E列 End User Company Name，H列 Product，M列 Total amount($)，N列 Invoice date。
      </p>

      <div
        className={`upload-zone ${dragover ? 'dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input id="file-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileInput} />
        {file ? (
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{file.name}</div>
            <div style={{ color: '#6e6e73', fontSize: '13px' }}>{(file.size / 1024).toFixed(1)} KB</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>点击或拖拽上传 Excel 文件</div>
            <div style={{ color: '#6e6e73', fontSize: '13px', marginTop: '6px' }}>支持 .xlsx 和 .xls 格式</div>
          </div>
        )}
      </div>

      {error && <div className="error-msg" style={{ marginTop: '16px' }}>{error}</div>}
      {result && <div style={{ marginTop: '16px', color: '#34c759', fontSize: '14px' }}>{result}</div>}

      <div style={{ marginTop: '20px' }}>
        <button className="btn btn-primary" disabled={!file || importing} onClick={handleImport}>
          {importing ? '导入中...' : '开始导入'}
        </button>
        <span style={{ marginLeft: '12px', color: '#6e6e73', fontSize: '13px' }}>
          重新导入将覆盖所有现有销售数据（全量刷新）
        </span>
      </div>
    </div>
  );
}

function SettingsModule() {
  const [view, setView] = useState('product-types');

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>系统设置</h2>
      </div>
      <div className="module-tabs">
        <button className={view === 'product-types' ? 'active' : ''} onClick={() => setView('product-types')}>产品类型维护</button>
        <button className={view === 'import' ? 'active' : ''} onClick={() => setView('import')}>销售数据导入</button>
      </div>
      <div className="module-content">
        {view === 'product-types' && <ProductTypeList />}
        {view === 'import' && <ImportPanel />}
      </div>
    </div>
  );
}
