import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CycleOutflowPoint } from '../cycleFinance';
import { formatShortDate } from '../cycleEngine';
import { formatPeso } from '../currency';
import { AppTheme, useTheme } from '../theme';

interface Props {
  points: CycleOutflowPoint[];
}

const CHART_HEIGHT = 100;

export default function SpendingTrendChart({ points }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(1, ...points.map((p) => p.outflow));

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={() => setExpanded((e) => !e)}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>Spending Trend</Text>
          <Text style={styles.subtitle}>
            Total outflow across your last {points.length} pay cycles
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.chartRow}>
          {points.map((p) => {
            const barHeight = Math.max(3, (p.outflow / max) * CHART_HEIGHT);
            return (
              <View key={p.identifier} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: p.isCurrent ? theme.navyLight : theme.navy,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {formatShortDate(p.start)}
                </Text>
                <Text style={styles.barValue} numberOfLines={1}>
                  {formatPeso(p.outflow)}
                </Text>
                {p.isCurrent && <Text style={styles.currentTag}>In progress</Text>}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerText: { flex: 1, marginRight: 8 },
    title: { fontSize: 14.5, fontWeight: '700', color: theme.text },
    subtitle: { fontSize: 11.5, color: theme.textMuted, marginTop: 2 },
    chevron: { fontSize: 14, color: theme.textMuted },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    barCol: { flex: 1, alignItems: 'center' },
    barTrack: {
      height: CHART_HEIGHT,
      width: 22,
      justifyContent: 'flex-end',
    },
    bar: {
      width: '100%',
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    barLabel: { fontSize: 10, color: theme.textMuted, marginTop: 6 },
    barValue: { fontSize: 9.5, fontWeight: '700', color: theme.text, marginTop: 1 },
    currentTag: {
      fontSize: 8.5,
      fontWeight: '700',
      color: theme.navyLight,
      marginTop: 2,
    },
  });
