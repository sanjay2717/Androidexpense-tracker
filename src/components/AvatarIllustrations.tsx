import React from 'react';
import Svg, {
  Path,
  Polygon,
  Rect,
  Circle,
  Ellipse,
  G,
  Line,
} from 'react-native-svg';

interface AvatarProps {
  width?: number;
  height?: number;
}

/**
 * Avatar 1: Meditating character in cross-legged lotus pose with coral bird on head.
 * Editorial flat 2D vector duotone style (Hot Pink #FF3D7F, Light Blush #FFD3E1, White #FFFFFF, Coral #FF7A59).
 */
export function AvatarMeditate({ width = 110, height = 110 }: AvatarProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200" fill="none">
      {/* Coral Bird on Head */}
      <G id="bird">
        <Path
          d="M93 17 C93 13 98 11 104 12 C108 13 111 16 110 19 C109 22 104 23 99 23 C95 23 93 20 93 17 Z"
          fill="#FF7A59"
        />
        <Path d="M110 15.5 L116 17 L110 18.5 Z" fill="#FF7A59" />
        <Path d="M96 17 C98 15 103 15 105 17 C103 19 98 19 96 17 Z" fill="#FFFFFF" />
        <Line x1="98" y1="23" x2="97" y2="26.5" stroke="#FF7A59" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="102" y1="23" x2="103" y2="26.5" stroke="#FF7A59" strokeWidth="1.5" strokeLinecap="round" />
      </G>

      {/* Hair Topknot */}
      <Ellipse cx="100" cy="27" rx="5" ry="3.5" fill="#FF3D7F" />

      {/* Solid Hair Silhouette */}
      <Path
        d="M85 36 C85 27 115 27 115 36 C115 42 112 47 110 50 C106 45 94 45 90 50 C88 47 85 42 85 36 Z"
        fill="#FF3D7F"
      />

      {/* Blank Editorial Face (No eyes, mouth, cheeks) */}
      <Path
        d="M88 38 C88 33 112 33 112 38 C112 47 108 55 100 56 C92 55 88 47 88 38 Z"
        fill="#FFD3E1"
      />

      {/* Simple Slender Neck */}
      <Polygon points="96,54 104,54 105,65 95,65" fill="#FFD3E1" />

      {/* White Collar Accent */}
      <Polygon points="92,65 108,65 104,77 96,77" fill="#FFFFFF" />

      {/* Chunky Geometric Torso / Hot Pink Sweater */}
      <Polygon points="76,73 92,65 108,65 124,73 121,118 79,118" fill="#FF3D7F" />

      {/* White Center Fold Strip */}
      <Rect x="98.5" y="77" width="3" height="41" fill="#FFFFFF" />

      {/* Left Arm (Lotus mudra pose) */}
      <Polygon points="76,73 60,92 50,108 58,114 68,100 79,85" fill="#FF3D7F" />
      <Path d="M47 103 C44 100 47 94 52 95 C55 96 55 104 50 106 Z" fill="#FFD3E1" />
      <Path d="M50 98 C49 95 53 94 54 96 Z" fill="#FFD3E1" />

      {/* Right Arm (Lotus mudra pose) */}
      <Polygon points="124,73 140,92 150,108 142,114 132,100 121,85" fill="#FF3D7F" />
      <Path d="M153 103 C156 100 153 94 148 95 C145 96 145 104 150 106 Z" fill="#FFD3E1" />
      <Path d="M150 98 C151 95 147 94 146 96 Z" fill="#FFD3E1" />

      {/* Crossed Legs (Lotus Pose - Chunky geometric panels) */}
      <Path d="M79,116 L54,127 L66,145 L106,140 L97,128 L79,128 Z" fill="#FFFFFF" />
      <Path d="M121,116 L146,127 L134,145 L94,140 L103,128 L121,128 Z" fill="#FFD3E1" />

      {/* Crossed Foot / Cuff Details in Hot Pink */}
      <Polygon points="66,141 74,147 85,145 78,139" fill="#FF3D7F" />
      <Polygon points="134,141 126,147 115,145 122,139" fill="#FF3D7F" />
      <Polygon points="94,136 106,136 103,148 97,148" fill="#FF3D7F" />
    </Svg>
  );
}

/**
 * Avatar 2: Peeking character from left edge with solid cap hair.
 * Cropped flush at screen left edge (x=0).
 */
export function AvatarPeekLeft({ width = 56, height = 74 }: AvatarProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 130" fill="none">
      {/* Back of Body / Shoulder Base flush to left edge */}
      <Polygon points="0,62 0,130 58,130 76,96 48,68 18,62" fill="#FF3D7F" />

      {/* White Inner Shirt / Collar Panel */}
      <Polygon points="18,62 48,68 56,86 28,84" fill="#FFFFFF" />

      {/* Neck */}
      <Polygon points="34,48 48,51 46,67 32,64" fill="#FFD3E1" />

      {/* Blank Editorial Face (No eyes, mouth, cheeks) */}
      <Path
        d="M22 28 C28 26 48 24 58 32 C65 38 66 48 60 55 C54 62 40 60 30 54 Z"
        fill="#FFD3E1"
      />

      {/* Solid Cap Hair */}
      <Path
        d="M0 24 C12 16 34 16 50 20 C62 23 68 28 66 35 C58 33 46 32 38 36 C30 40 24 48 18 52 C12 50 4 44 0 38 Z"
        fill="#FF3D7F"
      />
      <Ellipse cx="14" cy="18" rx="8" ry="6" fill="#FF3D7F" />

      {/* Forearm & Peeking Hand */}
      <Polygon points="12,100 44,92 56,104 22,116" fill="#FF3D7F" />
      <Path d="M52 98 C58 96 66 98 68 104 C69 108 64 112 58 111 C54 110 50 106 52 98 Z" fill="#FFD3E1" />
      <Path d="M58 98 C63 97 66 100 64 104 Z" fill="#FFD3E1" />
    </Svg>
  );
}

/**
 * Avatar 3: Peeking character from right edge holding coral sticky note.
 * Cropped flush at screen right edge (x=100).
 */
export function AvatarPeekRight({ width = 56, height = 74 }: AvatarProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 130" fill="none">
      {/* Back of Body / Shoulder Base flush to right edge */}
      <Polygon points="100,62 100,130 42,130 24,96 52,68 82,62" fill="#FF3D7F" />

      {/* White Inner Shirt / Collar Panel */}
      <Polygon points="82,62 52,68 44,86 72,84" fill="#FFFFFF" />

      {/* Neck */}
      <Polygon points="66,48 52,51 54,67 68,64" fill="#FFD3E1" />

      {/* Blank Editorial Face (No eyes, mouth, cheeks) */}
      <Path
        d="M78 28 C72 26 52 24 42 32 C35 38 34 48 40 55 C46 62 60 60 70 54 Z"
        fill="#FFD3E1"
      />

      {/* Different Hairstyle: Geometric Angular Bob / High Knot */}
      <Path
        d="M100 24 C88 16 66 16 50 20 C38 23 32 28 34 35 C42 33 54 32 62 36 C70 40 76 48 82 52 C88 50 96 44 100 38 Z"
        fill="#FF3D7F"
      />
      <Polygon points="76,14 88,14 94,26 80,26" fill="#FF3D7F" />

      {/* Forearm */}
      <Polygon points="88,100 56,92 44,104 78,116" fill="#FF3D7F" />

      {/* Hand Holding Sticky Note */}
      <Path d="M48 98 C42 96 34 98 32 104 C31 108 36 112 42 111 C46 110 50 106 48 98 Z" fill="#FFD3E1" />

      {/* Small Coral Sticky Note Accent (#FF7A59) */}
      <G id="sticky-note" transform="rotate(-12 28 92)">
        <Rect x="18" y="80" width="22" height="24" rx="2" fill="#FF7A59" />
        <Rect x="22" y="85" width="14" height="2" rx="1" fill="#FFFFFF" />
        <Rect x="22" y="90" width="10" height="2" rx="1" fill="#FFFFFF" />
        <Rect x="22" y="95" width="12" height="2" rx="1" fill="#FFFFFF" />
      </G>
    </Svg>
  );
}
