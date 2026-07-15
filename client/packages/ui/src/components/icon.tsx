import { icons, type LucideProps } from 'lucide-react';

export interface IconProps extends LucideProps {
  /** A Lucide icon name in PascalCase (matches backend `category.iconName`). */
  name: string;
}

/**
 * Renders a Lucide icon by name. Backend category `iconName` values map 1:1 to
 * Lucide's PascalCase names; unknown names fall back to a generic Package icon.
 */
export function Icon({ name, ...props }: IconProps) {
  const LucideIcon = icons[name as keyof typeof icons] ?? icons.Package;
  return <LucideIcon {...props} />;
}
