# Documents requis selon le type d'assurance demande. Sert a la fois a la
# validation cote serializer (create/resoumettre) et documente le contrat
# attendu par le frontend (un champ d'upload par cle presente ici).
#
# 'requis': True  -> le document DOIT etre fourni.
# 'requis': 'un_de:<groupe>' -> au moins un document du meme groupe doit
#            etre fourni (ex: titre de propriete OU bail pour l'habitation).

DOCUMENTS_REQUIS = {
    'AUTO': {
        'PIECE_IDENTITE': True,
        'CARTE_GRISE': True,
    },
    'HABITATION': {
        'PIECE_IDENTITE': True,
        'TITRE_PROPRIETE': 'un_de:justificatif_habitation',
        'BAIL': 'un_de:justificatif_habitation',
    },
    'SANTE': {
        'PIECE_IDENTITE': True,
    },
    'VIE': {
        'PIECE_IDENTITE': True,
    },
}

# Nom du champ multipart attendu pour chaque type de document.
CHAMP_PAR_TYPE_DOCUMENT = {
    'PIECE_IDENTITE': 'piece_identite',
    'CARTE_GRISE': 'carte_grise',
    'TITRE_PROPRIETE': 'titre_propriete',
    'BAIL': 'bail',
}
TYPE_DOCUMENT_PAR_CHAMP = {v: k for k, v in CHAMP_PAR_TYPE_DOCUMENT.items()}
