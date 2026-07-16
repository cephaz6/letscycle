// Placeholder browse data so the marketplace UI is real to look at before the
// listings API is wired (frontend step 7). Photos are remote (Unsplash); prices
// are integer pence, matching the backend money convention.

export interface MockListing {
  id: string;
  title: string;
  pricePence: number; // 0 = free to a good home
  category: string;
  distanceKm: number;
  condition: 'New' | 'Like new' | 'Good' | 'Fair';
  imageUrl: string;
  likes: number;
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&q=60`;

export const CATEGORIES = [
  'All',
  'Furniture',
  'Electronics',
  'Bikes',
  'Clothing',
  'Books',
  'Home',
  'Garden',
  'Sports',
  'Toys',
] as const;

export const MOCK_LISTINGS: MockListing[] = [
  {
    id: '1',
    title: 'Vintage road bike — recently serviced',
    pricePence: 12000,
    category: 'Bikes',
    distanceKm: 1.2,
    condition: 'Good',
    imageUrl: img('1485965120184-e220f721d03e'),
    likes: 24,
  },
  {
    id: '2',
    title: 'Two-seater linen sofa',
    pricePence: 0,
    category: 'Furniture',
    distanceKm: 2.3,
    condition: 'Good',
    imageUrl: img('1555041469-a586c61ea9bc'),
    likes: 51,
  },
  {
    id: '3',
    title: 'Mirrorless camera + 50mm lens',
    pricePence: 34500,
    category: 'Electronics',
    distanceKm: 4.1,
    condition: 'Like new',
    imageUrl: img('1516035069371-29a1b244cc32'),
    likes: 12,
  },
  {
    id: '4',
    title: 'Running trainers, worn twice',
    pricePence: 2800,
    category: 'Clothing',
    distanceKm: 0.8,
    condition: 'Like new',
    imageUrl: img('1542291026-7eec264c27ff'),
    likes: 8,
  },
  {
    id: '5',
    title: 'Box of paperback novels',
    pricePence: 0,
    category: 'Books',
    distanceKm: 3.0,
    condition: 'Good',
    imageUrl: img('1512820790803-83ca734da794'),
    likes: 5,
  },
  {
    id: '6',
    title: 'Large monstera in ceramic pot',
    pricePence: 1500,
    category: 'Garden',
    distanceKm: 1.9,
    condition: 'Good',
    imageUrl: img('1614594975525-e45190c55d0b'),
    likes: 33,
  },
  {
    id: '7',
    title: 'Acoustic guitar with soft case',
    pricePence: 8500,
    category: 'Electronics',
    distanceKm: 5.4,
    condition: 'Good',
    imageUrl: img('1510915361894-db8b60106cb1'),
    likes: 19,
  },
  {
    id: '8',
    title: 'Solid oak dining chair (x4)',
    pricePence: 6000,
    category: 'Furniture',
    distanceKm: 2.7,
    condition: 'Fair',
    imageUrl: img('1503602642458-232111445657'),
    likes: 14,
  },
  {
    id: '9',
    title: 'Over-ear headphones',
    pricePence: 4200,
    category: 'Electronics',
    distanceKm: 0.5,
    condition: 'Like new',
    imageUrl: img('1505740420928-5e560c06d30e'),
    likes: 27,
  },
  {
    id: '10',
    title: 'Canvas hiking backpack, 40L',
    pricePence: 3000,
    category: 'Sports',
    distanceKm: 3.6,
    condition: 'Good',
    imageUrl: img('1553062407-98eeb64c6a62'),
    likes: 9,
  },
  {
    id: '11',
    title: 'Kids wooden train set',
    pricePence: 0,
    category: 'Toys',
    distanceKm: 1.1,
    condition: 'Good',
    imageUrl: img('1558060370-d644479cb6f7'),
    likes: 41,
  },
  {
    id: '12',
    title: 'Ceramic table lamp',
    pricePence: 1800,
    category: 'Home',
    distanceKm: 2.0,
    condition: 'Like new',
    imageUrl: img('1513506003901-1e6a229e2d15'),
    likes: 16,
  },
];

/** Format integer pence as a price, or "Free" for zero. */
export function formatPrice(pence: number): string {
  if (pence === 0) return 'Free';
  return `£${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
