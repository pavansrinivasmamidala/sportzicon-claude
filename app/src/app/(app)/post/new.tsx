import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, Image as ImageIcon, Trash2, Video, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PerformanceRow, ScorecardCard } from '@/components/PerformanceCard';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Avatar, Button, IconButton, Sheet, Text, TopBar } from '@/components/ui';
import { useCreatePost } from '@/lib/api/feed';
import { usePerformances } from '@/lib/api/people';
import { useMe } from '@/lib/auth';
import type { PostKind } from '@/lib/types';
import { pickMedia, publicUrl, uploadFile, type PickedFile } from '@/lib/upload';
import { colors, fonts, radius } from '@/theme';
import { notify } from '@/lib/dialog';

export default function NewPost() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const params = useLocalSearchParams<{ kind?: string }>();
  const create = useCreatePost();
  const { data: perfs } = usePerformances(me.id);
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<PickedFile | null>(null);
  const [perfId, setPerfId] = useState<string | null>(null);
  const [pickPerf, setPickPerf] = useState(params.kind === 'scorecard');
  const [busy, setBusy] = useState(false);
  const perf = perfs?.find((p) => p.id === perfId) ?? null;

  const choose = async (kind: 'image' | 'video') => {
    try {
      const f = await pickMedia(kind);
      if (f) setMedia(f);
    } catch (e) {
      notify('Could not open your library', e instanceof Error ? e.message : '');
    }
  };

  // Open the photo/video picker straight away when the composer was opened from a quick action.
  useEffect(() => {
    const kind = params.kind;
    if (kind !== 'video' && kind !== 'image') return;
    const t = setTimeout(() => choose(kind), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPost = body.trim().length > 0 || !!media || !!perf;

  const submit = async () => {
    setBusy(true);
    try {
      let mediaUrl: string | null = null;
      if (media) mediaUrl = publicUrl('media', await uploadFile('media', me.id, media));
      const kind: PostKind = media ? media.kind === 'video' ? 'video' : 'image' : perf ? 'scorecard' : 'text';
      await create.mutateAsync({ kind, body: body.trim(), media_url: mediaUrl, performance_id: perf?.id ?? null });
      router.back();
    } catch (e) {
      notify('Could not post', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <TopBar
        title="New post"
        left={<IconButton icon={X} label="Cancel" tone="onDark" onPress={() => router.back()} />}
        right={<Button label="Post" size="sm" fullWidth={false} disabled={!canPost} loading={busy} onPress={submit} style={{ marginRight: 6 }} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Avatar name={me.full_name} url={me.avatar_url} size={40} />
            <Text variant="bodyStrong">{me.full_name}</Text>
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Share a match update, a training clip, or news from your academy…"
            placeholderTextColor={colors.inkFaint}
            multiline
            autoFocus={!params.kind}
            accessibilityLabel="Post text"
            style={{ minHeight: 120, fontSize: 17, lineHeight: 24, fontFamily: fonts.body, color: colors.ink, textAlignVertical: 'top', outlineStyle: 'none' } as object}
          />
          {media ? (
            <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.dark }}>
              {media.kind === 'image' ? (
                <Image source={{ uri: media.uri }} style={{ height: 240 }} contentFit="cover" />
              ) : (
                <VideoPlayer uri={media.uri} height={220} />
              )}
              <IconButton icon={Trash2} label="Remove media" tone="onDark" onPress={() => setMedia(null)} style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(15,23,42,0.7)' }} />
            </View>
          ) : null}
          {perf ? (
            <View>
              <ScorecardCard p={perf} />
              <Pressable onPress={() => setPerfId(null)} style={{ alignSelf: 'flex-end', padding: 8 }} accessibilityRole="button">
                <Text variant="smallStrong" color={colors.accent}>
                  Remove scorecard
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button label="Video" icon={Video} variant="secondary" size="sm" fullWidth={false} onPress={() => choose('video')} />
          <Button label="Photo" icon={ImageIcon} variant="secondary" size="sm" fullWidth={false} onPress={() => choose('image')} />
          <Button label="Scorecard" icon={FileText} variant="secondary" size="sm" fullWidth={false} onPress={() => setPickPerf(true)} />
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={pickPerf} onClose={() => setPickPerf(false)} title="Attach a scorecard" subtitle="Verified stats show a blue badge on your post.">
        {perfs?.length ? (
          perfs.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setPerfId(p.id);
                setPickPerf(false);
              }}
              accessibilityRole="button">
              <PerformanceRow p={p} last={i === perfs.length - 1} />
            </Pressable>
          ))
        ) : (
          <View style={{ gap: 12, paddingBottom: 8 }}>
            <Text color={colors.inkSecondary}>You haven’t added any match stats yet.</Text>
            <Button
              label="Add match stats"
              variant="secondary"
              onPress={() => {
                setPickPerf(false);
                router.push('/profile/add-stats');
              }}
            />
          </View>
        )}
      </Sheet>
    </View>
  );
}
