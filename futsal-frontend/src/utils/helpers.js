export const formatCurrency = (amount) =>
  `NPR ${Number(amount).toLocaleString('en-NP')}`;

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const formatTime = (time) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

export const statusColor = (status) => {
  const map = {
    pending: 'badge-yellow',
    confirmed: 'badge-green',
    cancelled: 'badge-red',
    expired: 'badge-gray',
    paid: 'badge-green',
    unpaid: 'badge-yellow',
    refunded: 'badge-blue',
    upcoming: 'badge-blue',
    ongoing: 'badge-green',
    completed: 'badge-gray',
    registration_open: 'badge-green',
  };
  return map[status] || 'badge-gray';
};

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

export const truncate = (str, len = 80) =>
  str && str.length > len ? str.slice(0, len) + '…' : str;
