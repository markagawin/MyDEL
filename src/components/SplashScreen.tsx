import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppTheme, useTheme } from '../theme';

export default function SplashScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>MyDEL</Text>
      <Text style={styles.appSubtitle}>My Daily Expenses in Life</Text>
      <Text style={styles.credit}>by: Mark Fidel Agawin</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    logo: {
      width: 96,
      height: 96,
      borderRadius: 20,
      marginBottom: 18,
    },
    appName: { fontSize: 28, fontWeight: '800', color: theme.navy },
    appSubtitle: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
    credit: { fontSize: 12, color: theme.textMuted, marginTop: 40 },
  });
