const { useState, useEffect, useRef } = React;

function FilterPanel({ filters, onChange, years, distributors, productTypes }) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
        <label className="form-label">年份</label>
        <select className="form-input" value={filters.year} onChange={e => onChange({ ...filters, year: e.target.value })}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
        <label className="form-label">代理商</label>
        <select className="form-input" value={filters.distributor} onChange={e => onChange({ ...filters, distributor: e.target.value })}>
          <option value="">全部</option>
          {distributors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ margin: 0, minWidth: '240px' }}>
        <label className="form-label">产品类型</label>
        <select className="form-input" value={filters.productType} onChange={e => onChange({ ...filters, productType: e.target.value })}>
          <option value="">全部</option>
          {productTypes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  );
}

function SalesChart({ monthlyData }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!monthlyData || !canvasRef.current) return;

    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const datasets = [
      { label: '授权收入', data: months.map(m => monthlyData[m]?.授权收入 || 0), backgroundColor: '#0071e3' },
      { label: '会员收入', data: months.map(m => monthlyData[m]?.会员收入 || 0), backgroundColor: '#34c759' },
      { label: '团队订阅收入', data: months.map(m => monthlyData[m]?.团队订阅收入 || 0), backgroundColor: '#ff9500' },
    ];

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels: months.map(m => `${m}月`), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: $${(ctx.raw || 0).toLocaleString()}`
            }
          },
          legend: { position: 'bottom' },
        },
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            ticks: { callback: v => '$' + v.toLocaleString() }
          }
        }
      }
    });

    chartRef.current = chart;

    // Draw monthly totals after chart renders
    function drawTotals() {
      if (!chartRef.current) return;
      const c = chartRef.current;
      if (!c.chartArea) return;

      const { ctx, chartArea, scales } = c;
      const xScale = scales.x;
      const yScale = scales.y;

      chart.data.labels.forEach((_, i) => {
        let total = 0;
        chart.data.datasets.forEach(ds => { total += (ds.data[i] || 0); });
        if (total === 0) return;

        const xLeft = xScale.getPixelForValue(i - 0.5);
        const xRight = xScale.getPixelForValue(i + 0.5);
        const xCenter = (xLeft + xRight) / 2;
        const yTop = yScale.getPixelForValue(total);

        if (yTop < chartArea.top) return;

        ctx.save();
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#1d1d1f';
        ctx.textAlign = 'center';
        ctx.fillText('$' + total.toLocaleString(), xCenter, yTop - 4);
        ctx.restore();
      });
    }

    // Try drawing after animation completes
    chart.options.animation.onComplete = drawTotals;
    chart.update();

    // Fallback: also try multiple times
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      drawTotals();
      if (attempts >= 5) clearInterval(interval);
    }, 200);

    return () => {
      clearInterval(interval);
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [monthlyData]);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>销售额趋势（按月）</h3>
      <div className="chart-container">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

function SalesTable({ monthlyData, totals }) {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  function fmt(v) {
    if (v === undefined || v === null) return '$0';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>数据统计表</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="report-table">
          <thead>
            <tr>
              <th>月份</th>
              <th>授权收入</th>
              <th>会员收入</th>
              <th>团队订阅收入</th>
              <th>合计</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const row = monthlyData[m] || { 授权收入: 0, 会员收入: 0, 团队订阅收入: 0 };
              const sum = (row.授权收入 || 0) + (row.会员收入 || 0) + (row.团队订阅收入 || 0);
              return (
                <tr key={m}>
                  <td>{m}月</td>
                  <td style={{ color: '#0071e3' }}>{fmt(row.授权收入)}</td>
                  <td style={{ color: '#34c759' }}>{fmt(row.会员收入)}</td>
                  <td style={{ color: '#ff9500' }}>{fmt(row.团队订阅收入)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(sum)}</td>
                </tr>
              );
            })}
            <tr style={{ background: '#f5f5f7', fontWeight: 700 }}>
              <td>合计</td>
              <td style={{ color: '#0071e3' }}>{fmt(totals?.授权收入)}</td>
              <td style={{ color: '#34c759' }}>{fmt(totals?.会员收入)}</td>
              <td style={{ color: '#ff9500' }}>{fmt(totals?.团队订阅收入)}</td>
              <td style={{ fontWeight: 700 }}>{fmt((totals?.授权收入 || 0) + (totals?.会员收入 || 0) + (totals?.团队订阅收入 || 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsModule() {
  const currentYear = new Date().getFullYear().toString();
  const [filters, setFilters] = useState({ year: currentYear, distributor: '', productType: '' });
  const [years, setYears] = useState([currentYear]);
  const [distributors, setDistributors] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('authToken');
    return { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
  };

  // Load filter options
  useEffect(() => {
    fetch('/api/reports/years', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (data.years && data.years.length > 0) setYears(data.years); });
    fetch('/api/reports/distributors', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setDistributors(data.distributors || []));
    fetch('/api/reports/product-types', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setProductTypes(data.productTypes || []));
  }, []);

  // Load report data when filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.distributor) params.append('distributor', filters.distributor);
    if (filters.productType) params.append('productType', filters.productType);

    fetch(`/api/reports/sales-summary?${params.toString()}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setMonthlyData(data.monthlyData || {});
        setTotals(data.totals || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>销售报表</h2>
      </div>
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          years={years}
          distributors={distributors}
          productTypes={productTypes}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
      ) : (
        <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <SalesChart monthlyData={monthlyData} />
          <SalesTable monthlyData={monthlyData} totals={totals} />
        </div>
      )}
    </div>
  );
}
