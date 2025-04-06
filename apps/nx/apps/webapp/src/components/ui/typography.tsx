import React from 'react';
import { fontAtkinson, fontMuseo } from '@/config/fonts';
import { cn } from './utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * Paragraph component that applies Atkinson font by default
 */
export const Paragraph = ({
  className,
  children,
  ...props
}: TypographyProps) => {
  return (
    <p
      className={cn(fontAtkinson.className, 'leading-7', className)}
      {...props}
    >
      {children}
    </p>
  );
};

/**
 * Lead text component (slightly larger paragraph)
 */
export const Lead = ({
  className,
  children,
  ...props
}: TypographyProps) => {
  return (
    <p
      className={cn(
        fontAtkinson.className, 
        'text-xl text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
};

/**
 * Large text component
 */
export const Large = ({
  className,
  children,
  ...props
}: TypographyProps) => {
  return (
    <div
      className={cn(
        fontAtkinson.className,
        'text-lg font-medium',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Small text component
 */
export const Small = ({
  className,
  children,
  ...props
}: TypographyProps) => {
  return (
    <small
      className={cn(
        fontAtkinson.className,
        'text-sm font-medium leading-none',
        className
      )}
      {...props}
    >
      {children}
    </small>
  );
};

/**
 * Muted text component
 */
export const Muted = ({
  className,
  children,
  ...props
}: TypographyProps) => {
  return (
    <p
      className={cn(
        fontAtkinson.className,
        'text-sm text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
};

/**
 * Heading component that uses Museo font for headers by default
 */
export const Heading = ({ 
  level = 1, 
  className, 
  children, 
  ...props 
}: TypographyProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) => {
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  
  const baseStyle = fontMuseo.className;
  
  const sizeStyles = {
    1: 'scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl',
    2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
    3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
    4: 'scroll-m-20 text-xl font-semibold tracking-tight',
    5: 'scroll-m-20 text-lg font-semibold tracking-tight',
    6: 'scroll-m-20 text-base font-semibold tracking-tight',
  };

  return (
    <Component
      className={cn(baseStyle, sizeStyles[level], className)}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * BlockQuote component with Atkinson font
 */
export const BlockQuote = ({
  className,
  children,
  ...props
}: TypographyProps) => {
  return (
    <blockquote
      className={cn(
        fontAtkinson.className,
        'mt-6 border-l-2 pl-6 italic',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
};