import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth.jsx';

let sharedSocket = null;
const listeners = new Set();
let reconnectTimer = null;

export function useTenantWebSocket(onMessage) {
  const { user } = useAuth();
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!user?.tenantId) return;

    const listener = (data) => {
      if (onMessageRef.current) {
        onMessageRef.current(data);
      }
    };
    listeners.add(listener);

    function connect() {
      if (sharedSocket && (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      try {
        sharedSocket = new WebSocket(wsUrl);

        sharedSocket.onopen = () => {
          if (sharedSocket?.readyState === WebSocket.OPEN) {
            sharedSocket.send(JSON.stringify({ type: 'join', tenantId: user.tenantId }));
          }
        };

        sharedSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            listeners.forEach((l) => {
              try {
                l(data);
              } catch (e) {
                console.error('Error in websocket listener:', e);
              }
            });
          } catch (err) {
            console.error('WebSocket message parse error', err);
          }
        };

        sharedSocket.onclose = () => {
          sharedSocket = null;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 4000);
        };

        sharedSocket.onerror = () => {
          try {
            sharedSocket?.close();
          } catch {
            // ignore
          }
        };
      } catch (err) {
        // ignore
      }
    }

    connect();

    return () => {
      listeners.delete(listener);
    };
  }, [user?.tenantId]);
}
