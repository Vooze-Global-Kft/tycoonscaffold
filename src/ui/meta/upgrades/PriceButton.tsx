/**
 * A buy button with its price under the label. The price shows the currency icon as an icon (it can
 * be an image, not only an emoji), and numbers shrink to fit rather than being cut.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { useTheme } from '../../theme';

interface Props {
  label: string;
  /** Formatted amount, without the currency. */
  price?: string;
  /** Currency icon drawn before the price. */
  priceIcon?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'success' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function PriceButton({ label, price, priceIcon, onPress, disabled, variant = 'primary', style }: Props) {
  const t = useTheme();
  const fg = variant === 'ghost' ? t.c.text : t.c.primaryText;
  return (
    <Button onPress={onPress} disabled={disabled} variant={variant} style={[styles.btn, style]}>
      <Text style={[t.display, styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {price ? (
        <View style={styles.priceRow}>
          {priceIcon ? <GameIcon icon={priceIcon} size={14} /> : null}
          <Text style={[styles.price, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {price}
          </Text>
        </View>
      ) : null}
    </Button>
  );
}

const styles = StyleSheet.create({
  btn: { minWidth: 92, minHeight: 50, paddingHorizontal: 10 },
  label: { fontSize: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1, maxWidth: 110 },
  price: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
});
