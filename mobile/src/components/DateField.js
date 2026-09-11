import { useState } from 'react';
import { Platform, View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';

// AAAA-MM-JJ avec zero-padding — format exact attendu par
// SinistreCreateSerializer (DateField Django). Lit les composants LOCAUX
// (getFullYear/getMonth/getDate), jamais date.toISOString() : ce dernier
// convertit en UTC et peut faire glisser la date d'un jour en arrière pour
// un fuseau positif comme Africa/Niamey (UTC+1) — vérifié : minuit local le
// 1er janvier donne bien "31 décembre" en UTC.
function formatAAAAMMJJ(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function parseAAAAMMJJ(valeur) {
  if (!valeur) return new Date();
  const [annee, mois, jour] = valeur.split('-').map(Number);
  return new Date(annee, mois - 1, jour);
}

// Sélecteur de date tactile — le comportement diffère volontairement par
// plateforme : Android ouvre le dialog natif impératif
// (DateTimePickerAndroid.open), le pattern recommandé par la lib pour cette
// plateforme (afficher le composant déclaratif "inline" en permanence se
// comporte mal sur Android). iOS n'a pas d'équivalent impératif : le
// composant déclaratif est affiché dans un Modal.
export default function DateField({ label, value, onChange, maximumDate, error }) {
  const [ouvertIOS, setOuvertIOS] = useState(false);
  const dateActuelle = parseAAAAMMJJ(value);

  const ouvrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateActuelle,
        mode: 'date',
        maximumDate,
        // onValueChange (et non le onChange desormais deprecie) : appele
        // uniquement sur une selection confirmee, avec la date en second
        // argument — pas besoin de filtrer par event.type ici.
        onValueChange: (_event, date) => {
          if (date) onChange(formatAAAAMMJJ(date));
        },
      });
    } else {
      setOuvertIOS(true);
    }
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={ouvrir}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value || 'AAAA-MM-JJ'}</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {Platform.OS !== 'android' && (
        <Modal visible={ouvertIOS} transparent animationType="slide" onRequestClose={() => setOuvertIOS(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOuvertIOS(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <DateTimePicker
                value={dateActuelle}
                mode="date"
                display="inline"
                maximumDate={maximumDate}
                onValueChange={(_event, date) => {
                  if (date) onChange(formatAAAAMMJJ(date));
                }}
              />
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setOuvertIOS(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.doneButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  fieldError: { borderColor: colors.danger },
  value: { fontSize: 15, color: colors.text },
  placeholder: { fontSize: 15, color: colors.textLight },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  doneButton: {
    marginTop: 8,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  doneButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
