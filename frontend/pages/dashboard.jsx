import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const PHASES = ['preprocess', 'transform', 'build', 'package'];

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [balance, setBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
    fetchBalance(t);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const fetchBalance = async (t = token) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/billing/balance`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (res.ok) setBalance(data.balance);
    } catch (err) {
      console.error('fetchBalance error:', err);
    }
  };

  const submitJob = async () => {
    setError('');
    setSubmitting(true);
    setProgress(0);
    setCurrentPhase('');
    setLogs([]);
    setDone(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payload: {} }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError('余额不足');
        } else {
          setError(data.message || '提交失败');
        }
        return;
      }
      connectWs(data.jobId);
    } catch (err) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const connectWs = (jid) => {
    setJobId(jid);
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/job/${jid}?token=${token}`);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setProgress(msg.progress);
        setCurrentPhase(msg.phase);
        setLogs((prev) => [...prev, `[${msg.phase}] ${msg.log}`]);
        if (msg.progress === 100) {
          setDone(true);
          fetchBalance();
        }
      } catch (err) {
        console.warn('WS message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WS error:', err);
      setError('WebSocket 连接错误');
    };

    ws.onclose = () => {
      console.warn('WS closed');
    };
  };

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>任务面板</h2>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            余额：{balance === null ? '加载中...' : `${balance} 点`}
          </span>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: 16 }}>提交新任务（消耗 10 点）</h4>
        <button className="btn" onClick={submitJob} disabled={submitting || done}>
          {submitting ? '提交中...' : '提交并执行'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {jobId && (
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>任务进度 — {jobId.slice(0, 8)}...</h4>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="phase-label">
            {done ? '完成' : currentPhase ? `正在执行：${currentPhase}` : '等待开始...'}
            {' '}({progress}%)
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {PHASES.map((p, i) => (
              <span
                key={p}
                style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: progress >= ((i + 1) / PHASES.length) * 100 ? '#dcfce7' : '#f1f5f9',
                  color: progress >= ((i + 1) / PHASES.length) * 100 ? '#16a34a' : '#94a3b8',
                }}
              >
                {p}
              </span>
            ))}
          </div>
          <div className="log-area" ref={logRef}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
            {logs.length === 0 && <span style={{ color: '#475569' }}>等待日志...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
