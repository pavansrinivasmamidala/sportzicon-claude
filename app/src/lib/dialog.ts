import { ActionSheetIOS, Alert, Platform } from 'react-native';

/**
 * Cross-platform dialogs. React Native's Alert does nothing on web, so the web preview
 * falls back to the browser's own dialogs and an in-app action sheet.
 */

const text = (title: string, message?: string) => (message ? `${title}\n\n${message}` : title);

/** Information-only message. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(text(title, message));
    return;
  }
  Alert.alert(title, message);
}

/** Yes/no question. Resolves true when the user confirms. */
export function confirm(opts: { title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean }): Promise<boolean> {
  const { title, message, confirmLabel, cancelLabel = 'Cancel', destructive } = opts;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(text(title, message)));
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

export interface MenuAction {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

type MenuConfig = { title?: string; actions: MenuAction[] };
let showMenu: ((cfg: MenuConfig) => void) | null = null;

/** Registered by <ActionMenuHost /> (mounted once in the root layout). */
export function registerActionMenu(fn: ((cfg: MenuConfig) => void) | null) {
  showMenu = fn;
}

/** Options menu ("…" buttons): native action sheet on iOS, bottom sheet on Android and web. */
export function chooseAction(cfg: MenuConfig) {
  if (Platform.OS === 'ios') {
    const labels = [...cfg.actions.map((a) => a.label), 'Cancel'];
    const destructive = cfg.actions.findIndex((a) => a.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      { title: cfg.title, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive >= 0 ? destructive : undefined },
      (i) => cfg.actions[i]?.onPress(),
    );
    return;
  }
  showMenu?.(cfg);
}
