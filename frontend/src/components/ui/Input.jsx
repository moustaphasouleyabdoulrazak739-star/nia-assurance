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

/** Champ texte standard (text, email, password, date, number, tel, file...).
 * `icon` (optionnel) : composant d'icône affiché en préfixe dans le champ. */
export function Input({ label, error, hint, id, required, icon: Icon, className = '', ...props }) {
  const field = (
    <input
      id={id}
      required={required}
      className={`${fieldBase} ${fieldState(error)} ${Icon ? 'pl-10' : ''} ${className}`}
      {...props}
    />
  );
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} required={required}>
      {Icon ? (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            <Icon className="h-4 w-4" />
          </span>
          {field}
        </div>
      ) : (
        field
      )}
    </FieldShell>
  );
}

/** Valeur non modifiable présentée comme un champ verrouillé : fond grisé,
 * cadenas, mention `mention`, ni flèches ni anneau de focus. `value` est
 * déjà formatée pour l'affichage ; vide, on affiche `placeholder`. */
export function ChampVerrouille({ label, error, hint, id, value, placeholder, mention, icon: Icon }) {
  const bordure = error ? 'border-red-300' : 'border-neutral-200';
  return (
    <FieldShell label={label} error={error} hint={hint} id={id}>
      <div className={`flex items-center gap-3 rounded-xl border ${bordure} bg-neutral-100 px-4 py-2.5 text-sm`}>
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-neutral-400" />}
        <output
          id={id}
          aria-readonly="true"
          className={`flex-1 ${value ? 'font-semibold text-neutral-700' : 'text-neutral-400'}`}
        >
          {value || placeholder}
        </output>
        {mention && <span className="text-xs text-neutral-500">{mention}</span>}
      </div>
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
