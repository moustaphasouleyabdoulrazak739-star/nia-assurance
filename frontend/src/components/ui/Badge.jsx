const VARIANTS = {
  success: 'bg-secondary-100 text-secondary-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-sky-100 text-sky-700',
  neutral: 'bg-neutral-100 text-neutral-600',
  brand: 'bg-primary-100 text-primary-700',
};

/** Pastille de statut — variant: success | warning | danger | info | neutral | brand */
export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
