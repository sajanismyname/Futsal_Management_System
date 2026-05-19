const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' };
  return (
    <div
      className={`animate-spin rounded-full border-2 border-hairline border-t-primary ${sizes[size]} ${className}`}
    />
  );
};

export const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-64 py-16">
    <Spinner size="lg" />
  </div>
);

export default Spinner;
