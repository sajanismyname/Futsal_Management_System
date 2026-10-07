const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

const parsePagination = (query = {}, defaultLimit = DEFAULT_LIMIT) => {
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const escapeRegex = (string = '') => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  parsePagination,
  escapeRegex,
  MAX_LIMIT,
  DEFAULT_LIMIT,
};
