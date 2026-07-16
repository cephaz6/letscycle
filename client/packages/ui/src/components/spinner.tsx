import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('size-6 animate-spin text-muted-foreground', className)}
    />
  );
}
