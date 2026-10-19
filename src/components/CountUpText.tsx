import React, { useEffect, useState } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

interface CountUpTextProps extends TextProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  style?: TextStyle | TextStyle[];
}

export function CountUpText({
  value,
  duration = 800,
  formatter = (v) => v.toLocaleString('en-IN'),
  style,
  ...rest
}: CountUpTextProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return (
    <Text style={style} {...rest}>
      {formatter(displayValue)}
    </Text>
  );
}
