import React from 'react';
import { fontAtkinson, fontMuseo } from '@/config/fonts';
import { cn } from './utils';

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'default' | 'heading' | 'subheading' | 'small' | 'large' | 'xlarge' | 'xxlarge';
  as?: 'p' | 'span' | 'div';
  children: React.ReactNode;
}

/**
 * Reusable Text component that applies Atkinson font by default
 */
export const Text = ({
  variant = 'default',
  as: Component = 'p',
  className,
  children,
  ...props
}: TextProps) => {
  const variantStyles = {
    default: `${fontAtkinson.className} text-base`,
    large: `${fontAtkinson.className} text-lg font-medium`,
    xlarge: `${fontAtkinson.className} text-xl font-medium`,
    xxlarge: `${fontAtkinson.className} text-2xl font-medium`,

    heading: `${fontMuseo.className}`, // No Atkinson by default for headings
    subheading: `${fontMuseo.className} text-lg font-medium`,

    small: `${fontAtkinson.className} text-small`,
  };

  return (
    <Component
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Text;