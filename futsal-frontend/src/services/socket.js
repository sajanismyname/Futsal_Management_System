import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      auth: { token: localStorage.getItem('futsal_token') || undefined },
    });
  }

  return socket;
};

export const connectSocket = () => {
  const instance = getSocket();
  instance.auth = { token: localStorage.getItem('futsal_token') || undefined };

  if (!instance.connected) {
    instance.connect();
  }

  return instance;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const timesOverlap = (start1, end1, start2, end2) => start1 < end2 && end1 > start2;

export default getSocket;
