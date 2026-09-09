const fieldBase =
  'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 transition focus:outline-none focus:ring-4 disabled:bg-neutral-50 disabled:text-neutral-400';

const fieldState = (error) =>
  error
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100';

function FieldShell({ label, error, hint, id, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-primary-600"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Champ texte standard (text, email, password, date, number, tel, file...). */
export function Input({ label, error, hint, id, required, className = '', ...props }) {
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} required={required}>
      <input
        id={id}
        required={required}
        className={`${fieldBase} ${fieldState(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

/** Liste déroulante au même habillage que Input. */
export function Select({ label, error, hint, id, required, className = '', children, ...props }) {
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} required={required}>
      <select
        id={id}
        required={required}
        className={`${fieldBase} ${fieldState(error)} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** Zone de texte multi-lignes au même habillage que Input. */
export function Textarea({ label, error, hint, id, required, className = '', ...props }) {
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} required={required}>
      <textarea
        id={id}
        required={required}
        className={`${fieldBase} ${fieldState(error)} resize-none ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export default Input;
