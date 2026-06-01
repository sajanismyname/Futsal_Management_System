const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const { setIO, courtRoom } = require('../services/socketService');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (user && !user.isSuspended) {
          socket.user = user;
        }
      } catch {
        // Allow anonymous connections for public court slot viewing
      }
    }

    next();
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(`user:${socket.user._id}`);
    }

    socket.on('court:join', ({ courtId, date }) => {
      if (courtId && date) {
        socket.join(courtRoom(courtId, date));
      }
    });

    socket.on('court:leave', ({ courtId, date }) => {
      if (courtId && date) {
        socket.leave(courtRoom(courtId, date));
      }
    });

    socket.on('tournament:join', ({ tournamentId }) => {
      if (tournamentId) {
        socket.join(`tournament:${tournamentId}`);
      }
    });

    socket.on('tournament:leave', ({ tournamentId }) => {
      if (tournamentId) {
        socket.leave(`tournament:${tournamentId}`);
      }
    });

    socket.on('owner:join', () => {
      if (socket.user?.role === 'owner') {
        socket.join(`owner:${socket.user._id}`);
      }
    });

    socket.on('owner:leave', () => {
      if (socket.user?.role === 'owner') {
        socket.leave(`owner:${socket.user._id}`);
      }
    });
  });

  setIO(io);
  console.log('[Socket.io] Real-time tracking enabled');

  return io;
};

module.exports = { initSocket };
