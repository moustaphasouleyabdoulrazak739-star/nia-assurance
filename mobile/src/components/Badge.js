import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// Pastille de statut — miroir de frontend/src/components/ui/Badge.jsx.
// variant: success | warning | danger | info | neutral | brand
const VARIANTS = {
  success: { bg: colors.secondarySoft, text: colors.secondary },
  warning: { bg: colors.warningSoft, text: colors.warning },
  danger: { bg: colors.dangerSoft, text: colors.danger },
  info: { bg: colors.infoSoft, text: colors.info },
  neutral: { bg: colors.neutralSoft, text: colors.neutral },
  brand: { bg: colors.primarySoft, text: colors.primary },
};

export default function Badge({ variant = 'neutral', children, style }) {
  const tones = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }, style]}>
      <Text style={[styles.text, { color: tones.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
