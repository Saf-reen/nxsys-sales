const InputField = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = true,
  error,
  invalid = undefined,
  id = undefined,
  ...props
}: {
  label?: string;
  type?: string;
  name: string;
  value: string;
  onChange: any;
  placeholder?: string;
  required?: boolean;
  error?: any;
  invalid?: boolean;
  id?: string;
  [key: string]: any;
}) => {
  const hasError = typeof invalid === 'boolean' ? invalid : Boolean(error);
  const errorMessage = typeof error === 'string' ? error.trim() : '';
  const inputId = id || name;
  const errorId = errorMessage && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={hasError}
        aria-describedby={errorId}
        className={`w-full rounded-2xl border-2 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:bg-white focus:ring-0 ${
          hasError
            ? 'border-rose-300 focus:border-rose-400'
            : 'border-slate-200 focus:border-primary'
        }`}
        {...props}
      />
      {errorMessage && (
        <p id={errorId} className="text-[11px] font-semibold text-rose-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default InputField;
