// Icônes SVG inline partagées — trait 1.75, cohérentes sur tout le site.
// Thème protection / confiance : bouclier, dossier, alerte, paiement, personne.

const base = (props) => ({
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  'aria-hidden': true,
  ...props,
});

export const IconShield = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export const IconHome = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9-7v18h4m-4 0H5a2 2 0 01-2-2v-9m16 11a2 2 0 002-2v-9m-9 11v-6a1 1 0 011-1h2a1 1 0 011 1v6" />
  </svg>
);

export const IconFileText = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export const IconAlertTriangle = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export const IconCreditCard = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

export const IconUser = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export const IconLogout = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export const IconMenu = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const IconClose = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const IconCheckCircle = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const IconClock = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
  </svg>
);

export const IconInbox = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l3-8h12l3 8m-18 0v6a2 2 0 002 2h14a2 2 0 002-2v-6m-18 0h4.5a1 1 0 01.9.55l.7 1.4a1 1 0 00.9.55h3a1 1 0 00.9-.55l.7-1.4a1 1 0 01.9-.55H21" />
  </svg>
);

export const IconMail = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const IconLock = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export const IconPhone = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.98.804l.57 2.85a1 1 0 01-.29.94l-1.2 1.2a11.05 11.05 0 005.52 5.52l1.2-1.2a1 1 0 01.94-.29l2.85.57a1 1 0 01.804.98V19a2 2 0 01-2 2h-1C8.716 21 3 15.284 3 8V5z" />
  </svg>
);

export const IconDownload = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export const IconPlus = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export const IconClipboardList = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6" />
  </svg>
);

export const IconRefresh = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const IconListBullet = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const IconChartBar = (props) => (
  <svg {...base(props)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
