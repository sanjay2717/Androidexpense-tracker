import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function HomeIcon({ size = 24, color = '#1a1b1f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182V20a1 1 0 0 0 1 1h5v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h5a1 1 0 0 0 1-1v-9.818a1 1 0 0 0-.39-.796l-8-6.154a1 1 0 0 0-1.22 0l-8 6.154A1 1 0 0 0 3 10.182Z"
        fill={color}
      />
    </Svg>
  );
}

export function WalletIcon({ size = 24, color = '#1a1b1f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 7H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm0 0V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="17.5" cy="14" r="1.5" fill={color} />
    </Svg>
  );
}

export function PlusIcon({ size = 28, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, color = '#1a1b1f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="3"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChartIcon({ size = 24, color = '#1a1b1f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 20V10M12 20V4M6 20v-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TuneIcon({ size = 20, color = '#5e5e5e' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 20, color = '#5e5e5e' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowUpIcon({ size = 18, color = '#059669' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19V5M5 12l7-7 7 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowDownIcon({ size = 18, color = '#b7004f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M19 12l-7 7-7-7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckCircleIcon({ size = 15, color = '#059669' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="m9 12 2 2 4-4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color = '#FF2D78' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m9 18 6-6-6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShieldCheckIcon({ size = 18, color = '#FF2D78' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9 12 2 2 4-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CategoryIcon({ name, color = '#FF2D78', size = 20 }: { name?: string; color?: string; size?: number }) {
  const normalized = (name || '').toLowerCase();

  if (normalized.includes('coffee') || normalized.includes('food') || normalized.includes('cafe') || normalized.includes('dining')) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8ZM6 1v3M10 1v3M14 1v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  if (normalized.includes('travel') || normalized.includes('uber') || normalized.includes('ride') || normalized.includes('car') || normalized.includes('fuel')) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM5 17H3v-6l2-5h14l2 5v6h-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  if (normalized.includes('movie') || normalized.includes('cinema') || normalized.includes('fun') || normalized.includes('ticket')) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} />
        <Path d="m10 9 5 3-5 3V9Z" fill={color} />
      </Svg>
    );
  }
  if (normalized.includes('sub') || normalized.includes('netflix') || normalized.includes('bill') || normalized.includes('stream')) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={2} />
        <Path d="M4 10h16M10 4v16" stroke={color} strokeWidth={2} />
      </Svg>
    );
  }
  // Default wallet / payment
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7v10M9 9h6M9 15h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BankIcon({ size = 22, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CashIcon({ size = 22, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={2} />
      <Path d="M6 12h.01M18 12h.01" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function CardIcon({ size = 22, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2.5" stroke={color} strokeWidth={2} />
      <Path d="M2 10h20" stroke={color} strokeWidth={2} />
      <Path d="M6 15h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function WalletIconByType({ iconName, size = 22, color = '#ffffff' }: { iconName?: string; size?: number; color?: string }) {
  const norm = (iconName || '').toLowerCase();
  if (norm.includes('cash') || norm.includes('payment') || norm.includes('bill')) {
    return <CashIcon size={size} color={color} />;
  }
  if (norm.includes('card') || norm.includes('credit') || norm.includes('debit') || norm.includes('upi')) {
    return <CardIcon size={size} color={color} />;
  }
  return <BankIcon size={size} color={color} />;
}

export function MinusIcon({ size = 20, color = '#5e5e5e' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = '#1a1b1f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DotsVerticalIcon({ size = 20, color = '#ffffff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.75" fill={color} />
      <Circle cx="12" cy="12" r="1.75" fill={color} />
      <Circle cx="12" cy="19" r="1.75" fill={color} />
    </Svg>
  );
}

export function PencilIcon({ size = 18, color = '#1a1b1f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrashIcon({ size = 18, color = '#ba1a1a' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

