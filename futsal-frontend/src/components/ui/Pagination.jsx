const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-hairline">
      <p className="text-sm text-slate">{total} total · page {page} of {pages}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-secondary disabled:opacity-40 text-xs px-3 py-1.5"
        >
          ← Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="btn-secondary disabled:opacity-40 text-xs px-3 py-1.5"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default Pagination;
