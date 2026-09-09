let compteurId = 0;

/**
 * Motif SVG discret en tuile (bouclier stylisé) — évoque la protection/
 * l'assurance sans distraire du contenu. Alternative sobre aux cercles flous
 * génériques. À poser en position absolute derrière le contenu (le parent
 * doit être `relative`) ; la couleur/opacité se règlent via `className`
 * (ex: "text-white/[0.06]").
 */
export default function BackgroundPattern({ className = '' }) {
  const id = `motif-bouclier-${compteurId++}`;
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <path
            d="M28 6 L44 12.5 V27 C44 38 37 46 28 50 C19 46 12 38 12 27 V12.5 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
