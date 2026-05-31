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

export const NEPAL_PHONE_REGEX = /^(97|98)\d{8}$/;

export const sanitizePhoneInput = (value) => value.replace(/\D/g, '').slice(0, 10);

export const validateNepalPhone = (phone) => {
  if (!phone) return 'Phone number is required';
  if (!NEPAL_PHONE_REGEX.test(phone)) {
    return 'Phone must be exactly 10 digits and start with 97 or 98';
  }
  return '';
};

export const truncate = (str, len = 80) =>
  str && str.length > len ? str.slice(0, len) + '…' : str;

export const getCourtApprovalStatus = (court) =>
  court?.approvalStatus || (court?.isApproved ? 'approved' : 'pending');

export const getCourtApprovalLabel = (status) => {
  const labels = {
    pending: 'Not approved',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return labels[status] || status;
};
