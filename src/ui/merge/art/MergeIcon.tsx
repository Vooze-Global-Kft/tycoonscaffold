/**
 * The merge mode's icon drawing for shared screens (parts.Icon, spec 7.2): "beast:<animal>" names
 * (the customers and minders) drawn from the art kit's animal atlas. PLACEHOLDER of the skeleton: a
 * round amber badge with the animal's first letter. Owned by the art kit package
 * (docs/design/market-build-plan.md).
 */
import { Text, View } from 'react-native';
import type { ModeIconProps } from '../../modeParts';

export function MergeIcon({ icon, size }: ModeIconProps) {
  const name = icon.startsWith('beast:') ? icon.slice(6) : icon;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F2A541', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5, color: '#1C2140' }} allowFontScaling={false}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
