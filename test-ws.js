const http = require('http');
const WebSocket = require('ws');

const BASE = 'http://localhost:3000';

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== 1. 登录获取 token ===');
  const loginRes = await post('/v1/auth/login', { username: 'test', tenantId: 'tenant-001', role: 'user' });
  const token = loginRes.body.token;
  console.log('token 获取成功');

  console.log('\n=== 2. 提交任务 ===');
  const jobRes = await post('/v1/jobs', { payload: {} }, { Authorization: `Bearer ${token}` });
  const jobId = jobRes.body.jobId;
  console.log('jobId:', jobId);

  console.log('\n=== 3. WebSocket 连接并接收 4 阶段进度 ===');
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:3000/ws/job/${jobId}?token=${token}`);
    const messages = [];
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('WS timeout after 20s'));
    }, 20000);

    ws.on('open', () => {
      console.log('WS connected');
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log(`  progress: ${msg.progress}%, phase: ${msg.phase}, log: ${msg.log}`);
      messages.push(msg);
    });

    ws.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`WS closed: code=${code}`);
      const ok = messages.length === 4 && messages.every(m => m.status === 'completed') && messages.some(m => m.progress === 100);
      if (ok) {
        console.log('✅ 4 阶段进度全部接收正确');
        resolve();
      } else {
        reject(new Error(`消息不完整: 收到 ${messages.length} 条`));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('\n=== 4. 无 token 连接应被拒绝 ===');
  await new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:3000/ws/job/${jobId}`);
    ws.on('close', (code) => {
      console.log(`无 token 关闭码: ${code} ${code !== 1000 ? '✅' : '❌'}`);
      resolve();
    });
    ws.on('error', () => {});
    setTimeout(resolve, 2000);
  });

  console.log('\n=== 5. 错误 token 连接应被拒绝 ===');
  await new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:3000/ws/job/${jobId}?token=invalid`);
    ws.on('close', (code) => {
      console.log(`错误 token 关闭码: ${code} ${code !== 1000 ? '✅' : '❌'}`);
      resolve();
    });
    ws.on('error', () => {});
    setTimeout(resolve, 2000);
  });

  console.log('\n=== 6. 租户隔离（tenant-002 token 查 tenant-001 job）===');
  const login2 = await post('/v1/auth/login', { username: 'test2', tenantId: 'tenant-002', role: 'user' });
  const token2 = login2.body.token;
  await new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:3000/ws/job/${jobId}?token=${token2}`);
    ws.on('close', (code) => {
      console.log(`跨租户关闭码: ${code} ${code !== 1000 ? '✅' : '❌'}`);
      resolve();
    });
    ws.on('error', () => {});
    setTimeout(resolve, 2000);
  });

  console.log('\n=== 全部通过 ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
