import type { CategorySeed } from './category.repository.js';

// Launch categories for Liverpool. typicalDistanceKm is the default match/search
// radius for the category — small, heavy, or bulky items travel less.
// iconName is a Lucide icon name (PascalCase) so the web client renders it
// directly via <Icon name={category.iconName} />.
export const CATEGORY_SEED: CategorySeed[] = [
  { slug: 'furniture', name: 'Furniture', typicalDistanceKm: 15, iconName: 'Sofa' },
  { slug: 'electronics', name: 'Electronics', typicalDistanceKm: 25, iconName: 'Tv' },
  {
    slug: 'clothing',
    name: 'Clothing & Accessories',
    typicalDistanceKm: 30,
    iconName: 'Shirt',
  },
  {
    slug: 'books-media',
    name: 'Books, Music & Films',
    typicalDistanceKm: 30,
    iconName: 'BookOpen',
  },
  {
    slug: 'home-kitchen',
    name: 'Home & Kitchen',
    typicalDistanceKm: 15,
    iconName: 'Utensils',
  },
  { slug: 'baby-kids', name: 'Baby & Kids', typicalDistanceKm: 20, iconName: 'Baby' },
  {
    slug: 'toys-games',
    name: 'Toys & Games',
    typicalDistanceKm: 20,
    iconName: 'Gamepad2',
  },
  {
    slug: 'sports-outdoors',
    name: 'Sports & Outdoors',
    typicalDistanceKm: 20,
    iconName: 'Bike',
  },
  { slug: 'garden-diy', name: 'Garden & DIY', typicalDistanceKm: 15, iconName: 'Shovel' },
  {
    slug: 'pet-supplies',
    name: 'Pet Supplies',
    typicalDistanceKm: 20,
    iconName: 'PawPrint',
  },
  {
    slug: 'health-beauty',
    name: 'Health & Beauty',
    typicalDistanceKm: 30,
    iconName: 'Sparkles',
  },
  { slug: 'other', name: 'Other', typicalDistanceKm: 20, iconName: 'Package' },
];
