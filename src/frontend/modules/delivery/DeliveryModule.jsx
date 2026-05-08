const { useState, useEffect } = React;

const productTypes = [
  { value: 'business_annual', label: 'Business License - Annual' },
  { value: 'business_lifetime', label: 'Business License - Lifetime' },
  { value: 'wps_pro_annual', label: 'WPS Pro - Annual' },
  { value: 'others', label: 'Others' }
];

const fieldsConfig = {
  business_annual: ['clientName', 'quantity', 'duration', 'startDate', 'endDate', 'afterSalesDeadline', 'activationCode'],
  business_lifetime: ['clientName', 'quantity', 'startDate', 'afterSalesDeadline', 'activationCode'],
  wps_pro_annual: ['clientName', 'quantity', 'duration', 'endDate', 'afterSalesDeadline', 'activationCode'],
  others: ['clientName', 'quantity', 'duration', 'startDate', 'endDate', 'afterSalesDeadline', 'activationCode']
};

function getToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function addYears(dateStr, years) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

// ===== Step1Form =====
function Step1Form({ onNext, productTypes: availableTypes }) {
  const rawTypes = availableTypes && availableTypes.length > 0 ? availableTypes : productTypes;
  // Normalize: API returns {id, label}, hardcoded uses {value, label}
  const types = rawTypes.map(t => ({ value: t.value || t.id, label: t.label }));
  const [productType, setProductType] = useState(types[0]?.value || 'business_annual');
  const [fields, setFields] = useState({
    clientName: '',
    quantity: '',
    duration: 1,
    startDate: getToday(),
    endDate: '',
    afterSalesDeadline: '',
    activationCode: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const duration = parseInt(fields.duration, 10) || 1;
    const isLifetime = productType === 'business_lifetime';

    if (isLifetime) {
      const deadline = addYears(fields.startDate, 3);
      setFields(f => ({ ...f, afterSalesDeadline: deadline }));
    } else {
      const endDate = addYears(fields.startDate, duration);
      setFields(f => ({ ...f, endDate, afterSalesDeadline: endDate }));
    }
  }, []);

  function handleProductTypeChange(e) {
    const newType = e.target.value;
    setProductType(newType);

    const duration = parseInt(fields.duration, 10) || 1;
    if (newType === 'business_lifetime') {
      setFields(f => ({ ...f, afterSalesDeadline: addYears(f.startDate, 3) }));
    } else {
      setFields(f => {
        const endDate = addYears(f.startDate, duration);
        return { ...f, endDate, afterSalesDeadline: endDate };
      });
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const newFields = { ...fields, [name]: value };
    setFields(newFields);

    if (name === 'duration' || name === 'startDate') {
      const duration = parseInt(name === 'duration' ? value : fields.duration, 10) || 1;
      const start = name === 'startDate' ? value : fields.startDate;
      const isLifetime = productType === 'business_lifetime';

      if (isLifetime) {
        newFields.afterSalesDeadline = addYears(start, 3);
      } else {
        newFields.endDate = addYears(start, duration);
        newFields.afterSalesDeadline = addYears(start, duration);
      }
      setFields(newFields);
    }

    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  }

  function validate() {
    const errs = {};
    const visibleFields = fieldsConfig[productType] || [];

    if (visibleFields.includes('clientName') && !fields.clientName.trim()) {
      errs.clientName = '请输入客户名称';
    }
    if (visibleFields.includes('quantity')) {
      const qty = parseInt(fields.quantity, 10);
      if (!fields.quantity || isNaN(qty) || qty < 1 || qty > 999999) {
        errs.quantity = '请输入有效授权数量（1 - 999999）';
      }
    }
    if (visibleFields.includes('duration')) {
      const dur = parseInt(fields.duration, 10);
      if (!fields.duration || isNaN(dur) || dur < 1) {
        errs.duration = '请输入有效授权期限';
      }
    }
    if (visibleFields.includes('startDate') && !fields.startDate) {
      errs.startDate = '请选择生效时间';
    }
    if (visibleFields.includes('endDate') && !fields.endDate) {
      errs.endDate = '请选择结束时间';
    }
    if (visibleFields.includes('endDate') && fields.startDate && fields.endDate && fields.endDate <= fields.startDate) {
      errs.endDate = '结束时间须晚于生效时间';
    }
    if (visibleFields.includes('activationCode') && !fields.activationCode.trim()) {
      errs.activationCode = '请输入激活码';
    }
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const productTypeLabel = types.find(p => p.value === productType)?.label || productType;
    onNext({
      ...fields,
      productType,
      productTypeLabel,
      quantity: parseInt(fields.quantity, 10),
      duration: parseInt(fields.duration, 10)
    });
  }

  function renderField(fieldName) {
    switch (fieldName) {
      case 'clientName':
        return (
          <div className="form-group" key="clientName">
            <label className="form-label">客户名称</label>
            <input className={`form-input ${errors.clientName ? 'error' : ''}`} name="clientName" placeholder="请输入客户名称" value={fields.clientName} onChange={handleChange} />
            {errors.clientName && <div className="error-msg">{errors.clientName}</div>}
          </div>
        );
      case 'quantity':
        return (
          <div className="form-group" key="quantity">
            <label className="form-label">授权数量</label>
            <input className={`form-input ${errors.quantity ? 'error' : ''}`} name="quantity" type="number" min="1" max="999999" placeholder="请输入授权数量" value={fields.quantity} onChange={handleChange} />
            {errors.quantity && <div className="error-msg">{errors.quantity}</div>}
          </div>
        );
      case 'duration':
        return (
          <div className="form-group" key="duration">
            <label className="form-label">授权期限（年）</label>
            <input className={`form-input ${errors.duration ? 'error' : ''}`} name="duration" type="number" min="1" placeholder="请输入授权期限" value={fields.duration} onChange={handleChange} />
            {errors.duration && <div className="error-msg">{errors.duration}</div>}
          </div>
        );
      case 'startDate':
        return (
          <div className="form-group" key="startDate">
            <label className="form-label">生效时间</label>
            <input className={`form-input ${errors.startDate ? 'error' : ''}`} name="startDate" type="date" value={fields.startDate} onChange={handleChange} />
            {errors.startDate && <div className="error-msg">{errors.startDate}</div>}
          </div>
        );
      case 'endDate':
        return (
          <div className="form-group" key="endDate">
            <label className="form-label">结束时间</label>
            <input className={`form-input ${errors.endDate ? 'error' : ''}`} name="endDate" type="date" value={fields.endDate} readOnly />
            {errors.endDate && <div className="error-msg">{errors.endDate}</div>}
          </div>
        );
      case 'afterSalesDeadline':
        return (
          <div className="form-group" key="afterSalesDeadline">
            <label className="form-label">售后截止日期</label>
            <input className="form-input" name="afterSalesDeadline" type="date" value={fields.afterSalesDeadline} readOnly />
          </div>
        );
      case 'activationCode':
        return (
          <div className="form-group full-width" key="activationCode">
            <label className="form-label">激活码</label>
            <input className={`form-input ${errors.activationCode ? 'error' : ''}`} name="activationCode" placeholder="请输入激活码" value={fields.activationCode} onChange={handleChange} />
            {errors.activationCode && <div className="error-msg">{errors.activationCode}</div>}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div>
      <div className="card-title">填写发货信息</div>
      <div className="form-group">
        <label className="form-label">产品类型</label>
        <select className="form-input" name="productType" value={productType} onChange={handleProductTypeChange}>
          {types.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
        </select>
      </div>
      <div className="form-grid">
        {(fieldsConfig[productType] || []).includes('clientName') && renderField('clientName')}
        {(fieldsConfig[productType] || []).includes('quantity') && renderField('quantity')}
        {(fieldsConfig[productType] || []).includes('duration') && renderField('duration')}
      </div>
      <div className="form-grid">
        {(fieldsConfig[productType] || []).includes('startDate') && renderField('startDate')}
        {(fieldsConfig[productType] || []).includes('endDate') && renderField('endDate')}
        {(fieldsConfig[productType] || []).includes('afterSalesDeadline') && renderField('afterSalesDeadline')}
      </div>
      <div className="form-grid">
        {(fieldsConfig[productType] || []).includes('activationCode') && renderField('activationCode')}
      </div>
      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleSubmit}>下一步</button>
      </div>
    </div>
  );
}

// ===== Step2EmailEdit =====
function Step2EmailEdit({ formData, onNext, onPrev }) {
  const [emailContent, setEmailContent] = useState('');
  const [copyDone, setCopyDone] = useState(false);

  const fieldsConfig2 = {
    business_annual: ['clientName', 'quantity', 'duration', 'startDate', 'endDate', 'afterSalesDeadline', 'activationCode'],
    business_lifetime: ['clientName', 'quantity', 'startDate', 'afterSalesDeadline', 'activationCode'],
    wps_pro_annual: ['clientName', 'quantity', 'duration', 'endDate', 'afterSalesDeadline', 'activationCode'],
    others: ['clientName', 'quantity', 'duration', 'startDate', 'endDate', 'afterSalesDeadline', 'activationCode']
  };

  function generateEmailContent() {
    if (!formData) return '';
    const visibleFields = fieldsConfig2[formData.productType] || [];
    const isWpsPro = formData.productType === 'wps_pro_annual';
    const codeLabel = isWpsPro ? 'Redeem Code' : 'License code';
    const durationLabel = isWpsPro ? 'Membership Duration' : 'License Duration';
    const lines = [
      'Please check attached invoice and certificate for this PO.',
      `• ${codeLabel}: ${formData.activationCode}`
    ];
    lines.push(`• Product Type: ${formData.productTypeLabel || formData.productType}`);
    if (visibleFields.includes('duration')) lines.push(`• ${durationLabel}: ${formData.duration} year(s)`);
    if (visibleFields.includes('startDate')) lines.push(`• Effective date: ${formData.startDate}`);
    if (visibleFields.includes('endDate')) lines.push(`• Expire date: ${formData.endDate}`);
    if (visibleFields.includes('afterSalesDeadline')) lines.push(`• Update Deadline: ${formData.afterSalesDeadline}`);
    lines.push(`• Quantity: ${formData.quantity}`);
    lines.push('');
    if (formData.productType === 'wps_pro_annual') {
      lines.push('Package download link: https://www.wps.com/download/');
      lines.push('How to use Redeem Code:');
      lines.push('https://help.wps.com/articles/how-to-use-redeem-code/');
      lines.push('https://www.wps.com/redeem-code/');
    } else if (formData.productType === 'business_annual') {
      lines.push('Package download link: https://wdl1.pcfg.cache.wpscdn.com/wpsdl/wpsoffice/download/pro/11.2.0.10330/100.903/WPSOffice_11.2.0.10330_Pro.exe');
      lines.push('How to activate WPS Office products with product keys: https://help.wps.com/articles/how-to-activate-wps-office-products-with-product-keys/');
    } else if (formData.productType === 'business_lifetime') {
      lines.push('Package download link: https://wdl1.pcfg.cache.wpscdn.com/wpsdl/wpsoffice/download/pro/11.2.0.10330/100.903/WPSOffice_11.2.0.10330_Pro.exe');
      lines.push('How to activate WPS Office products with product keys: https://help.wps.com/articles/how-to-activate-wps-office-products-with-product-keys/');
    }
    lines.push('');
    lines.push('Best Regards,');
    return lines.join('\n');
  }

  useEffect(() => { setEmailContent(generateEmailContent()); }, [formData]);

  function handleCopy() {
    const textarea = document.createElement('textarea');
    textarea.value = emailContent;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch (e) {
      navigator.clipboard.writeText(emailContent).then(() => {
        setCopyDone(true);
        setTimeout(() => setCopyDone(false), 2000);
      });
    }
    document.body.removeChild(textarea);
  }

  return (
    <div>
      <div className="card-title">确认邮件内容</div>
      <textarea className="email-textarea" value={emailContent} onChange={e => setEmailContent(e.target.value)} />
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={handleCopy}>复制邮件内容</button>
        <span className={`copy-feedback ${copyDone ? 'show' : ''}`}>已复制 ✓</span>
      </div>
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onPrev}>上一步</button>
        <button className="btn btn-primary" onClick={onNext}>下一步</button>
      </div>
    </div>
  );
}

// ===== Step3Record =====
function Step3Record({ formData, onReset }) {
  const [recordStatus, setRecordStatus] = useState('loading');
  const [certStatus, setCertStatus] = useState('loading');
  const [certFileName, setCertFileName] = useState('');
  const called = useRef(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    fetch('/api/save-record', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData) })
      .then(r => r.json())
      .then(data => setRecordStatus(data.ok ? 'done' : 'error'))
      .catch(() => setRecordStatus('error'));

    fetch('/api/generate-cert', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData) })
      .then(r => r.json())
      .then(data => {
        if (data.ok) { setCertFileName(data.fileName); setCertStatus('done'); }
        else setCertStatus('error');
      })
      .catch(() => setCertStatus('error'));
  }, []);

  function handleOpenExcel() {
    const token = localStorage.getItem('authToken');
    fetch('/api/open-excel', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }).catch(() => {});
  }

  function handleDownloadCert() {
    if (!certFileName) return;
    const token = localStorage.getItem('authToken');
    fetch(`/api/download-cert?file=${encodeURIComponent(certFileName)}`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = certFileName; a.click();
        URL.revokeObjectURL(url);
      }).catch(() => {});
  }

  function StatusBadge({ status }) {
    const map = { loading: { cls: 'loading', text: '处理中…' }, done: { cls: 'done', text: '完成' }, error: { cls: 'error', text: '失败' } };
    const { cls, text } = map[status] || map.loading;
    return <span className={`status-badge ${cls}`}>{status === 'loading' && <span className="spinner"></span>}{text}</span>;
  }

  const allDone = recordStatus === 'done' && certStatus === 'done';
  const anyError = recordStatus === 'error' || certStatus === 'error';

  return (
    <div>
      <div className="card-title">保存记录 & 生成授权书</div>
      {(allDone || anyError) && (
        <div className="success-banner" style={anyError ? { background: '#fff1f0', borderColor: '#fca5a5' } : {}}>
          <div className="success-icon" style={anyError ? { background: '#ff3b30' } : {}}>{anyError ? '!' : '✓'}</div>
          <div className="success-text" style={anyError ? { color: '#7f1d1d' } : {}}>
            {anyError ? '部分操作失败，请查看详情' : '发货记录已保存，授权书已生成'}
          </div>
        </div>
      )}
      <div className="action-list">
        <div className="action-item">
          <div className="action-item-info">
            <div className="action-item-title">发货记录</div>
            <div className="action-item-desc">写入 records/delivery_records.xlsx</div>
          </div>
          <StatusBadge status={recordStatus} />
        </div>
        <div className="action-item">
          <div className="action-item-info">
            <div className="action-item-title">授权书</div>
            <div className="action-item-desc">{certStatus === 'done' ? certFileName : '生成授权书文件'}</div>
          </div>
          <StatusBadge status={certStatus} />
        </div>
      </div>
      <div className="btn-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleOpenExcel} disabled={recordStatus !== 'done'}>查看发货记录</button>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={handleDownloadCert} disabled={certStatus !== 'done'}>下载授权书</button>
        </div>
        <button className="btn btn-secondary" onClick={onReset}>重新发货</button>
      </div>
    </div>
  );
}

// ===== DeliveryModule Container =====
function DeliveryModule({ username, onLogout }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(null);
  const [productTypes, setProductTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const steps = [{ label: '发货信息' }, { label: '邮件内容' }, { label: '保存记录' }];

  useEffect(() => {
    fetch('/api/settings/product-types', { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } })
      .then(r => r.json())
      .then(data => { setProductTypes(data.productTypes || []); setLoadingTypes(false); })
      .catch(() => setLoadingTypes(false));
  }, []);

  function nextStep() { setStep(s => s + 1); }
  function prevStep() { setStep(s => s - 1); }
  function reset() { setStep(1); setFormData(null); }

  if (loadingTypes) {
    return <div className="card" style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>;
  }

  return (
    <div className="module-container">
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>发货工具</h2>
          <p style={{ color: '#6e6e73', fontSize: '14px', marginTop: '4px' }}>填写发货信息 · 生成邮件 · 保存记录</p>
        </div>
        <div>
          <span style={{ fontSize: '13px', color: '#6e6e73' }}>欢迎, {username}</span>
          <button className="btn btn-secondary" style={{ marginLeft: '12px', padding: '6px 14px', fontSize: '13px' }} onClick={onLogout}>退出</button>
        </div>
      </div>

      <div className="step-indicator">
        {steps.map((s, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <React.Fragment key={num}>
              {i > 0 && <div className={`step-line ${isDone ? 'done' : ''}`}></div>}
              <div className="step-item">
                <div className={`step-circle ${isActive ? 'active' : isDone ? 'done' : ''}`}>{isDone ? '✓' : num}</div>
                <div className={`step-label ${isActive ? 'active' : ''}`}>{s.label}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="card" style={step === 3 ? { maxWidth: '1000px' } : {}}>
        {step === 1 && <Step1Form onNext={(data) => { setFormData(data); nextStep(); }} productTypes={productTypes} />}
        {step === 2 && <Step2EmailEdit formData={formData} onNext={nextStep} onPrev={prevStep} />}
        {step === 3 && <Step3Record formData={formData} onReset={reset} />}
      </div>
    </div>
  );
}
