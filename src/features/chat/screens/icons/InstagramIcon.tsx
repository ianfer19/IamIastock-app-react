import React from 'react';
import Svg, { Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  style?: any;
}

export default function InstagramIcon({ size = 24, color = '#E1306C', style }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke={color} />
      <Circle cx="12" cy="12" r="5" stroke={color} />
      <Line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
