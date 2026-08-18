import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { AppTheme, useTheme } from '../theme';

interface Props {
  visible: boolean;
  message: string;
}

export default function Toast({ visible, message }: Props) {
  const theme = useTheme();
  const styles = useRef(createStyles(theme)).current;
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : -80,
        useNativeDriver: true,
        speed: 14,
        bounciness: 8,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { transform: [{ translateY }], opacity }]}
    >
      <Text style={styles.icon}>✓</Text>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 12,
      left: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.successSurface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.success,
      zIndex: 999,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
    icon: { fontSize: 16, fontWeight: '800', color: theme.success, marginRight: 8 },
    text: { fontSize: 13.5, fontWeight: '700', color: theme.success, flex: 1 },
  });
