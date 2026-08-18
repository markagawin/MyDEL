import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';

export interface DonutSlice {
  key: string;
  color: string;
  value: number;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({
  slices,
  size = 220,
  strokeWidth = 34,
  selectedKey,
  onSelectKey,
}: Props) {
  const theme = useTheme();
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - strokeWidth;
  const positive = slices.filter((s) => s.value > 0);

  if (total <= 0) {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Path
            d={donutSlicePath(cx, cy, outerR, innerR, 0, Math.PI * 2 - 0.001)}
            fill={theme.border}
          />
        </Svg>
      </View>
    );
  }

  let cursor = 0;
  const paths = positive.map((slice) => {
    const fraction = slice.value / total;
    const startAngle = cursor * Math.PI * 2;
    cursor += fraction;
    const endAngle = cursor * Math.PI * 2;
    return { slice, startAngle, endAngle };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {paths.length === 1 ? (
          <>
            <Path
              d={donutSlicePath(cx, cy, outerR, innerR, 0, Math.PI)}
              fill={paths[0].slice.color}
              onPress={() =>
                onSelectKey(selectedKey === paths[0].slice.key ? null : paths[0].slice.key)
              }
            />
            <Path
              d={donutSlicePath(cx, cy, outerR, innerR, Math.PI, Math.PI * 2)}
              fill={paths[0].slice.color}
              onPress={() =>
                onSelectKey(selectedKey === paths[0].slice.key ? null : paths[0].slice.key)
              }
            />
          </>
        ) : (
          paths.map(({ slice, startAngle, endAngle }) => {
            const isSelected = selectedKey === slice.key;
            const isDimmed = selectedKey !== null && !isSelected;
            const sliceOuterR = isSelected ? outerR + 6 : outerR;
            return (
              <Path
                key={slice.key}
                d={donutSlicePath(cx, cy, sliceOuterR, innerR, startAngle, endAngle)}
                fill={slice.color}
                opacity={isDimmed ? 0.3 : 1}
                onPress={() => onSelectKey(isSelected ? null : slice.key)}
              />
            );
          })
        )}
      </Svg>
    </View>
  );
}
