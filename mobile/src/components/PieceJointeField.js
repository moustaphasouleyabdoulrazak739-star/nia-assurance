import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { formaterTaille } from '../utils/demandes';

// Champ de pièce jointe d'une demande de contrat : fichier choisi (nom,
// taille), trois sources (fichier PDF ou image, appareil photo, galerie)
// et erreur locale ou serveur affichée sous le champ.
export default function PieceJointeField({ label, aide, fichier, error, disabled, onChoisir, onRetirer }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {aide ? <Text style={styles.aide}>{aide}</Text> : null}

      <View style={[styles.box, error && styles.boxError]}>
        {fichier ? (
          <View style={styles.fichierRow}>
            <View style={styles.fichierInfos}>
              <Text style={styles.fichierNom} numberOfLines={1}>
                {fichier.name}
              </Text>
              <Text style={styles.fichierTaille}>{formaterTaille(fichier.size)}</Text>
            </View>
            <TouchableOpacity onPress={onRetirer} disabled={disabled} hitSlop={8}>
              <Text style={styles.retirer}>Retirer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.vide}>Aucun fichier choisi</Text>
        )}

        <View style={styles.sources}>
          <Source titre={fichier ? 'Remplacer' : 'Fichier'} onPress={() => onChoisir('fichier')} disabled={disabled} />
          <Source titre="Photo" onPress={() => onChoisir('photo')} disabled={disabled} />
          <Source titre="Galerie" onPress={() => onChoisir('galerie')} disabled={disabled} />
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Source({ titre, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.source, disabled && styles.sourceDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.sourceText}>{titre}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  aide: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
  },
  boxError: { borderColor: colors.danger },
  fichierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fichierInfos: { flex: 1 },
  fichierNom: { fontSize: 14, fontWeight: '600', color: colors.text },
  fichierTaille: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  retirer: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  vide: { fontSize: 14, color: colors.textLight },
  sources: { flexDirection: 'row', gap: 8, marginTop: 10 },
  source: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.secondarySoft,
    borderRadius: 10,
    paddingVertical: 9,
  },
  sourceDisabled: { opacity: 0.5 },
  sourceText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
