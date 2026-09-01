const AuthButton = ({ children, loading, className = '', ...props }) => {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[12px] font-black uppercase tracking-[0.16em] text-textMain transition-all hover:opacity-90 hover:shadow-[0_8px_20px_rgba(48,149,248,0.3)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin text-textMain"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {loading ? 'Processing...' : children}
    </button>
  );
};

export default AuthButton;
