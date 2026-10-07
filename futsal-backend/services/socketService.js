let io = null;

const formatDateKey = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const courtRoom = (courtId, date) => `court:${courtId}:${formatDateKey(date)}`;

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => io;

const emitSlotUpdate = ({ courtId, bookingDate, startTime, endTime, isBooked }) => {
  if (!io) return;

  const dateKey = formatDateKey(bookingDate);
  io.to(courtRoom(courtId, dateKey)).emit('slot:updated', {
    courtId: courtId.toString(),
    date: dateKey,
    startTime,
    endTime,
    isBooked,
  });
};

const emitBookingUpdate = (ownerId, booking, action) => {
  if (!io || !ownerId) return;

  io.to(`owner:${ownerId.toString()}`).emit('booking:updated', {
    action,
    booking,
  });
};

const emitFixtureUpdate = (tournamentId, fixtures, standings) => {
  if (!io) return;

  io.to(`tournament:${tournamentId.toString()}`).emit('fixture:updated', {
    tournamentId: tournamentId.toString(),
    fixtures,
    standings,
  });
};

const emitNotification = (userId, notification) => {
  if (!io) return;

  io.to(`user:${userId.toString()}`).emit('notification:new', { notification });
};

const disconnectUserSockets = (userId) => {
  if (!io || !userId) return;
  try {
    io.in(`user:${userId.toString()}`).disconnectSockets(true);
  } catch (err) {
    console.error(`Error disconnecting sockets for user ${userId}:`, err.message);
  }
};

module.exports = {
  setIO,
  getIO,
  formatDateKey,
  courtRoom,
  emitSlotUpdate,
  emitBookingUpdate,
  emitFixtureUpdate,
  emitNotification,
  disconnectUserSockets,
};
