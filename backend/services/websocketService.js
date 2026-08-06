const ws = require('ws');
const logger = require('../utils/logger');

let wss;
const clients = new Set();

function init(server) {
  wss = new ws.Server({ server });
  logger.info('WebSocket Server initialized.');

  wss.on('connection', (socket) => {
    logger.info('WebSocket connection established.');
    clients.add(socket);

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'join' && data.tenantId) {
          socket.tenantId = data.tenantId;
          logger.info(`WebSocket client joined tenant: ${data.tenantId}`);
        }
      } catch (err) {
        logger.error({ err }, 'Error parsing WebSocket message');
      }
    });

    socket.on('close', () => {
      logger.info('WebSocket connection closed.');
      clients.delete(socket);
    });

    socket.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
      clients.delete(socket);
    });
  });
}

function broadcastToTenant(tenantId, data) {
  if (!wss) {
    logger.warn('WebSocket server not initialized; cannot broadcast.');
    return;
  }
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === ws.OPEN && client.tenantId === tenantId) {
      client.send(payload);
    }
  });
}

module.exports = {
  init,
  broadcastToTenant,
};
