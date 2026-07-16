'use client';

import { usePathname } from 'next/navigation';
import { CategoryNav } from './category-nav';

// Account / personal pages don't get the marketplace category strip.
const HIDE_ON = [
  '/me',
  '/wishlist',
  '/settings',
  '/messages',
  '/transactions',
  '/notifications',
  '/u/',
];

export function ConditionalCategoryNav() {
  const pathname = usePathname();
  if (HIDE_ON.some((prefix) => pathname.startsWith(prefix))) return null;
  return <CategoryNav />;
}
