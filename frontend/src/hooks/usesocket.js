// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

/**
 * Custom hook for Socket.io real‑time communication.
 * Automatically connects on mount and disconnects on unmount.
 */
const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Join a conversation room (by ID)
   * @param {string} conversationId
   */
  const joinConversation = (conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('joinConversation', conversationId);
    }
  };

  /**
   * Send a message to a conversation room.
   * @param {string} conversationId
   * @param {object} messageData - { text, senderId, senderName, timestamp }
   */
  const sendMessage = (conversationId, messageData) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('sendMessage', { conversationId, ...messageData });
    }
  };

  /**
   * Subscribe to an event (e.g., 'newMessage').
   * @param {string} event
   * @param {function} callback
   */
  const onEvent = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  /**
   * Unsubscribe from an event.
   * @param {string} event
   * @param {function} callback
   */
  const offEvent = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    isConnected,
    joinConversation,
    sendMessage,
    onEvent,
    offEvent,
    socket: socketRef.current,
  };
};

export default useSocket;