import { forwardRef } from 'react';

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// Une couleur de bordure passée par className (ex. border-red-100 sur une
// carte d'alerte) remplace la bordure neutre au lieu d'entrer en conflit.
const COULEUR_BORDURE = /(^|\s)border-[a-z]+-\d{2,3}(\s|$)/;

/**
 * Carte de contenu : fond blanc, bordure fine, sans ombre.
 * hoverable : uniquement pour une carte cliquable (bordure plus marquée au survol).
 */
const Card = forwardRef(function Card(
  { as: Tag = 'div', padding = 'md', hoverable = false, className = '', children, ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={[
        'bg-white rounded-lg border',
        COULEUR_BORDURE.test(className) ? '' : 'border-neutral-200',
        hoverable ? 'transition-colors duration-150 hover:border-neutral-400' : '',
        PADDINGS[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
});

export default Card;
