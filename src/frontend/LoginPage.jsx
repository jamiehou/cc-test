const { useState } = React;

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setLoading(true);
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.ok) {
          onLogin(data.token, data.username);
        } else {
          setError(data.error || '登录失败');
        }
      })
      .catch(() => {
        setLoading(false);
        setError('登录失败，请检查网络连接');
      });
  }

  return (
    <div className="login-screen">
      <div className="login-header">
        <h1>CC 销售系统</h1>
        <p>请先登录</p>
      </div>
      <div className="card" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        <div className="card-title">用户登录</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              className="form-input"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className="form-input"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
