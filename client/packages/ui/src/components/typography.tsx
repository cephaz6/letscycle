import { forwardRef } from 'react';
import { cn } from '../lib/cn';

type HeadingLevel = 1 | 2 | 3 | 4;

const headingStyles: Record<HeadingLevel, string> = {
  1: 'text-3xl font-bold tracking-tight sm:text-4xl',
  2: 'text-2xl font-semibold tracking-tight',
  3: 'text-xl font-semibold tracking-tight',
  4: 'text-lg font-semibold',
};

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, className, ...props }, ref) => {
    const Tag = `h${level}` as const;
    return (
      <Tag ref={ref} className={cn(headingStyles[level], className)} {...props} />
    );
  },
);
Heading.displayName = 'Heading';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  muted?: boolean;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ muted = false, className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-base leading-relaxed',
        muted ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
      {...props}
    />
  ),
);
Text.displayName = 'Text';
