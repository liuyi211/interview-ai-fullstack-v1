const { URL } = require('url');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const eventBus = require('./eventBus');
const Job = require('../models/job.model');

const attachWsServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    if (!req.url.startsWith('/ws/job/')) {
      ws.close(4001, 'Invalid path');
      return;
    }
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathParts = url.pathname.split('/');
      const jobId = pathParts[pathParts.length - 1];
      const token = url.searchParams.get('token');

      if (!jobId || !token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const payload = jwt.verify(token, config.jwt.secret);
      const job = await Job.findOne({ jobId, tenantId: payload.tenantId });
      if (!job) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const listener = (event) => {
        ws.send(JSON.stringify(event));
        if (event.progress === 100) {
          setTimeout(() => ws.close(), 500);
        }
      };

      eventBus.on(`job:${jobId}`, listener);

      ws.on('close', () => {
        eventBus.off(`job:${jobId}`, listener);
      });
    } catch (err) {
      ws.close(4001, 'Unauthorized');
    }
  });

  return wss;
};

module.exports = { attachWsServer };
