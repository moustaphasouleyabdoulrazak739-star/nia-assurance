import { forwardRef } from 'react';

const VARIANTS = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-200 disabled:bg-primary-200 disabled:text-white',
  secondary:
    'bg-secondary-700 text-white hover:bg-secondary-800 active:bg-secondary-900 focus-visible:ring-secondary-200 disabled:bg-secondary-200 disabled:text-white',
  outline:
    'bg-white text-neutral-700 border border-neutral-200 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 focus-visible:ring-primary-100 disabled:text-neutral-300 disabled:border-neutral-100',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:ring-neutral-200 disabled:text-neutral-300',
  danger:
    'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:ring-red-100 disabled:text-red-200 disabled:border-red-100',
};

const SIZES = {
  sm: 'text-sm px-3.5 py-2 gap-1.5',
  md: 'text-sm px-5 py-2.5 gap-2',
  lg: 'text-base px-6 py-3 gap-2',
};

/**
 * Bouton de marque NIA Assurance.
 * variant: primary | secondary | outline | ghost | danger
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-xl font-semibold',
        'transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
