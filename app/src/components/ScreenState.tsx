import { View } from 'react-native';

import { ErrorView, Loading, TopBar } from '@/components/ui';
import { colors } from '@/theme';

/** Loading / error state for a pushed screen, keeping the top bar so the user can always go back. */
export function ScreenState({ error, title }: { error?: string | null; title?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <TopBar back title={title} />
      {error ? <ErrorView message={error} /> : <Loading />}
    </View>
  );
}
