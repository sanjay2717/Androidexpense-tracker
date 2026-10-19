export const theme = {
  colors: {
    primary: '#FF2D78', // Electric Accent Pink
    primaryDark: '#b7004f',
    primaryContainer: '#e40a65',
    primaryFixed: '#ffd9df',
    primaryFixedDim: '#ffb1c0',
    primaryMuted: 'rgba(255, 45, 120, 0.12)',
    primaryGlow: 'rgba(255, 45, 120, 0.22)',

    // Surfaces & Neutral canvas
    background: '#FAFAFC',
    surface: '#faf9fe',
    surfaceContainerLowest: '#ffffff', // Cards
    surfaceContainerLow: '#f4f3f8',    // Inset strips
    surfaceContainer: '#eeedf3',
    surfaceContainerHigh: '#e9e7ed',
    surfaceContainerHighest: '#e3e2e7',

    // Text & Labels
    onSurface: '#1a1b1f',
    onSurfaceVariant: '#5b3f44',
    secondary: '#73737a',
    secondaryContainer: '#e2e2e2',

    // Semantic tints
    tertiary: '#4c4aca',
    tertiaryContainer: '#6664e4',
    tertiaryFixed: '#e2dfff',

    // Income / Success
    emerald: '#10b981',
    emeraldDark: '#059669',
    emeraldLight: '#ecfdf5',

    // Expense / Error
    rose: '#f43f5e',
    roseLight: '#fff1f2',
    error: '#ba1a1a',

    // Borders & Hairlines
    outline: '#8f6f74',
    outlineVariant: '#e4bdc3',
    hairline: 'rgba(60, 60, 67, 0.08)',
  },

  radii: {
    card: 22,
    button: 16,
    input: 14,
    thumbnail: 12,
    sm: 8,
    pill: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    margin: 16,
    gutter: 12,
  },

  typography: {
    numeralHero: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: '800' as const,
      letterSpacing: -1.2,
    },
    title1: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700' as const,
      letterSpacing: -0.7,
    },
    title2: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
    },
    title3: {
      fontSize: 20,
      lineHeight: 25,
      fontWeight: '600' as const,
      letterSpacing: -0.3,
    },
    headline: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    body: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '400' as const,
      letterSpacing: -0.1,
    },
    subheadline: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    callout: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '500' as const,
      letterSpacing: -0.1,
    },
    footnote: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
    },
  },

  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 2,
    },
    elevatedButton: {
      shadowColor: '#e40a65',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 6,
    },
    glow: {
      shadowColor: '#FF2D78',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 4,
    },
  },
} as const;

export type Theme = typeof theme;
