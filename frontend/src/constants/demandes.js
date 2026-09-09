// Miroir cote frontend de demandes/constants.py (backend) : determine quels
// champs d'upload afficher selon le type d'assurance choisi. La validation
// definitive reste faite cote serveur — ceci ne sert qu'a guider l'utilisateur.

export const TYPES_ASSURANCE = [
  { value: 'AUTO', label: 'Assurance Auto' },
  { value: 'SANTE', label: 'Assurance Santé' },
  { value: 'HABITATION', label: 'Assurance Habitation' },
  { value: 'VIE', label: 'Assurance Vie' },
];

// requis: true -> obligatoire ; 'un_de' -> au moins un des champs du meme
// groupe 'un_de' est obligatoire (ex: titre de propriete OU bail).
export const DOCUMENTS_PAR_TYPE = {
  AUTO: [
    { champ: 'piece_identite', label: "Pièce d'identité", requis: true },
    { champ: 'carte_grise', label: 'Carte grise', requis: true },
  ],
  HABITATION: [
    { champ: 'piece_identite', label: "Pièce d'identité", requis: true },
    { champ: 'titre_propriete', label: 'Titre de propriété', requis: 'un_de' },
    { champ: 'bail', label: 'Bail (contrat de location)', requis: 'un_de' },
  ],
  SANTE: [
    { champ: 'piece_identite', label: "Pièce d'identité", requis: true },
  ],
  VIE: [
    { champ: 'piece_identite', label: "Pièce d'identité", requis: true },
  ],
};
