import React from 'react';

interface AvatarBorderProps {
  borderStyle?: string;
  size: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * AvatarBorder – clean, unbordered circular avatar container.
 * Renders avatars with crisp monochrome styling without neon gradients or colored borders.
 */
export default function AvatarBorder({
  size,
  children,
  className,
  style,
  title,
}: AvatarBorderProps) {
  return (
    <div
      className={className}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
