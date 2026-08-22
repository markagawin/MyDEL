import { Platform, TextStyle } from 'react-native';

/**
 * A TextInput's rounded corners come from a wrapping element's border, not the underlying
 * <input>'s own box (which react-native-web renders with no border-radius). The browser's
 * default focus outline traces that square input box, so on web it visibly clips at the
 * wrapper's rounded corners when focused. Spread this into a TextInput's style to remove it
 * — the existing border is enough of a focus cue without a broken outline on top of it.
 *
 * RN's TextStyle types `outlineStyle` as 'solid' | 'dotted' | 'dashed' (a border-style-like
 * property, not the CSS outline reset) and rejects 'none', even though react-native-web
 * accepts it fine at runtime. The `as TextStyle` cast is localized to this one definition so
 * call sites don't need their own casts.
 */
export const noWebOutline: TextStyle | undefined =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;
