import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    let activeSocket = null;

    // Real Socket.IO connection requiring active JWT token (NFR-03)
    if (isAuthenticated && token) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

      console.log(`[Socket] Connecting live to Socket.IO server at ${socketUrl}`);
      activeSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      activeSocket.on('connect', () => {
        console.log(`[Socket] Connected live with ID: ${activeSocket.id}`);
        setConnected(true);
        setConnectionError(null);
      });

      activeSocket.on('disconnect', (reason) => {
        console.log(`[Socket] Disconnected: ${reason}`);
        setConnected(false);
      });

      activeSocket.on('connect_error', (err) => {
        console.error(`[Socket Connection Error]: ${err.message}`);
        setConnected(false);
        setConnectionError(err.message);
      });

      setSocket(activeSocket);

      return () => {
        if (activeSocket) {
          activeSocket.disconnect();
        }
      };
    } else {
      setSocket(null);
      setConnected(false);
    }
  }, [token, isAuthenticated]);

  const value = useMemo(
    () => ({
      socket,
      connected,
      connectionError,
    }),
    [socket, connected, connectionError]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
