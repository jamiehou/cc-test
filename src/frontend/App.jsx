const { useState, useEffect } = React;

function Sidebar({ activeModule, onModuleChange, username, onLogout }) {
  const navItems = [
    { id: 'delivery', label: '发货工具', icon: '📦' },
    { id: 'settings', label: '系统设置', icon: '⚙️' },
    { id: 'reports', label: '销售报表', icon: '📊' },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">CC Sales</div>
      <div className="sidebar-user">
        <span>{username}</span>
        <button className="sidebar-logout" onClick={onLogout}>退出</button>
      </div>
      <div className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-item ${activeModule === item.id ? 'active' : ''}`}
            onClick={() => onModuleChange(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeModule, setActiveModule] = useState('delivery');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('username');
    if (token && storedUsername) {
      fetch('/api/check-auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            setIsLoggedIn(true);
            setUsername(data.username);
          }
          setCheckingAuth(false);
        })
        .catch(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  function handleLogin(token, user) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', user);
    setIsLoggedIn(true);
    setUsername(user);
  }

  function handleLogout() {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    setActiveModule('delivery');
  }

  if (checkingAuth) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: '#6e6e73' }}>加载中...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        username={username}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {activeModule === 'delivery' && <DeliveryModule username={username} onLogout={handleLogout} />}
        {activeModule === 'settings' && <SettingsModule />}
        {activeModule === 'reports' && <ReportsModule />}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
