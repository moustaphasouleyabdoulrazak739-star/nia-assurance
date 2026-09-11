import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// Sélecteur simple basé sur un Modal + liste — évite d'ajouter une
// dépendance native (@react-native-picker/picker) pour de courtes listes
// d'options (contrats, type de sinistre).
export default function SelectField({ label, placeholder, value, options, onChange, error }) {
  const [ouvert, setOuvert] = useState(false);
  const selection = options.find((option) => option.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setOuvert(true)}
        activeOpacity={0.7}
      >
        <Text style={selection ? styles.value : styles.placeholder} numberOfLines={1}>
          {selection ? selection.label : placeholder}
        </Text>
        <Text style={styles.chevron}>{'v'}</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={ouvert} animationType="slide" transparent onRequestClose={() => setOuvert(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOuvert(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>{label || placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOuvert(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyOptions}>Aucune option disponible.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  fieldError: { borderColor: colors.danger },
  value: { fontSize: 15, color: colors.text, flex: 1, marginRight: 8 },
  placeholder: { fontSize: 15, color: colors.textLight, flex: 1, marginRight: 8 },
  chevron: { fontSize: 13, color: colors.textLight, fontWeight: '700' },
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
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionText: { fontSize: 15, color: colors.text },
  optionTextActive: { color: colors.primary, fontWeight: '700' },
  emptyOptions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: colors.textMuted,
    fontSize: 13,
  },
});
