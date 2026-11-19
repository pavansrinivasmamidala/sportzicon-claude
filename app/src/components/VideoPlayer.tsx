import { useVideoPlayer, VideoView } from 'expo-video';
import { View } from 'react-native';

import { colors } from '@/theme';

/** Inline reel player with native controls; loops, starts muted on tap-to-play. */
export function VideoPlayer({ uri, height = 220 }: { uri: string; height?: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  return (
    <View style={{ height, backgroundColor: colors.dark2 }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls />
    </View>
  );
}
