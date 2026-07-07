import type { CategorySeed } from './category.repository.js';

// Launch categories for Liverpool. typicalDistanceKm is the default match/search
// radius for the category — small, heavy, or bulky items travel less.
export const CATEGORY_SEED: CategorySeed[] = [
  { slug: 'furniture', name: 'Furniture', typicalDistanceKm: 15, iconName: 'sofa' },
  { slug: 'electronics', name: 'Electronics', typicalDistanceKm: 25, iconName: 'tv' },
  {
    slug: 'clothing',
    name: 'Clothing & Accessories',
    typicalDistanceKm: 30,
    iconName: 'shirt',
  },
  {
    slug: 'books-media',
    name: 'Books, Music & Films',
    typicalDistanceKm: 30,
    iconName: 'book',
  },
  {
    slug: 'home-kitchen',
    name: 'Home & Kitchen',
    typicalDistanceKm: 15,
    iconName: 'utensils',
  },
  { slug: 'baby-kids', name: 'Baby & Kids', typicalDistanceKm: 20, iconName: 'baby' },
  {
    slug: 'toys-games',
    name: 'Toys & Games',
    typicalDistanceKm: 20,
    iconName: 'gamepad',
  },
  {
    slug: 'sports-outdoors',
    name: 'Sports & Outdoors',
    typicalDistanceKm: 20,
    iconName: 'bike',
  },
  { slug: 'garden-diy', name: 'Garden & DIY', typicalDistanceKm: 15, iconName: 'shovel' },
  { slug: 'pet-supplies', name: 'Pet Supplies', typicalDistanceKm: 20, iconName: 'paw' },
  {
    slug: 'health-beauty',
    name: 'Health & Beauty',
    typicalDistanceKm: 30,
    iconName: 'sparkles',
  },
  { slug: 'other', name: 'Other', typicalDistanceKm: 20, iconName: 'box' },
];
