const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const ACCENTS = {
  primary: 'border-l-4 border-primary-600',
  secondary: 'border-l-4 border-secondary-700',
  none: '',
};

/**
 * Carte de contenu — fond blanc, ombre douce, pas de bordure dure.
 * accent: applique un liseré de couleur de marque à gauche (à utiliser avec parcimonie).
 */
export default function Card({
  as: Tag = 'div',
  padding = 'md',
  accent = 'none',
  hoverable = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={[
        'bg-white rounded-2xl shadow-card',
        hoverable ? 'transition-shadow duration-200 hover:shadow-card-hover' : '',
        PADDINGS[padding],
        ACCENTS[accent],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
