import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const ETAPES = ['Déclaré', 'En cours', 'Traité'];

function etapeIndex(statut) {
  if (statut === 'EN_ATTENTE') return 0;
  if (statut === 'EN_COURS') return 1;
  return 2; // APPROUVE, REJETE, REGLE : le dossier a atteint son étape finale
}

// Mini-timeline de traitement (déclaré -> en cours -> traité) — miroir de
// frontend/src/pages/Sinistres.jsx:SinistreTimeline, avec des pastilles et
// libellés compacts adaptés à la largeur d'un écran mobile plutôt que les
// barres larges de la version web.
export default function SinistreTimeline({ statut }) {
  const etapeActuelle = etapeIndex(statut);
  const estRejete = statut === 'REJETE';

  return (
    <View style={styles.row}>
      {ETAPES.map((etape, i) => {
        const atteinte = i <= etapeActuelle;
        const dernier = i === ETAPES.length - 1;
        const pastilleStyle = !atteinte
          ? styles.pastilleInactive
          : dernier && estRejete
            ? styles.pastilleRejetee
            : styles.pastilleActive;

        return (
          <View key={etape} style={dernier ? styles.etapeFinale : styles.etape}>
            <View style={styles.etapeContent}>
              <View style={[styles.pastille, pastilleStyle]}>
                <Text style={[styles.pastilleTexte, atteinte ? styles.pastilleTexteActif : styles.pastilleTexteInactif]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.libelle, atteinte ? styles.libelleActif : styles.libelleInactif]}>
                {etape}
              </Text>
            </View>
            {!dernier && (
              <View style={[styles.trait, i < etapeActuelle ? styles.traitActif : styles.traitInactif]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  etape: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  etapeFinale: { flexDirection: 'row', alignItems: 'center' },
  etapeContent: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pastille: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleActive: { backgroundColor: colors.secondary },
  pastilleRejetee: { backgroundColor: colors.danger },
  pastilleInactive: { backgroundColor: colors.neutralSoft },
  pastilleTexte: { fontSize: 10, fontWeight: '700' },
  pastilleTexteActif: { color: '#fff' },
  pastilleTexteInactif: { color: colors.textLight },
  libelle: { fontSize: 11, fontWeight: '600' },
  libelleActif: { color: colors.text },
  libelleInactif: { color: colors.textLight },
  trait: { flex: 1, height: 2, marginHorizontal: 6, borderRadius: 1 },
  traitActif: { backgroundColor: colors.secondary },
  traitInactif: { backgroundColor: colors.neutralSoft },
});
