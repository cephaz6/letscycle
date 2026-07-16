// Shared category list used by the header strip (and later the browse filters).
// `icon` is a Lucide name resolved by <Icon name> — the same convention the
// backend uses for `category.iconName`. `items` populate the hover menu.
//
// TODO: source these from the backend (GET /categories) once the design is
// settled; hardcoded here for now so the layout can be built independently.

export interface SiteCategory {
  label: string;
  icon: string;
  items: string[];
}

export const SITE_CATEGORIES: SiteCategory[] = [
  {
    label: 'Furniture',
    icon: 'Sofa',
    items: ['Sofas & couches', 'Chairs', 'Tables', 'Beds & mattresses', 'Storage', 'Desks'],
  },
  {
    label: 'Electronics',
    icon: 'Smartphone',
    items: ['Phones', 'Laptops & computers', 'Audio', 'Cameras', 'TVs', 'Gaming'],
  },
  {
    label: 'Clothing',
    icon: 'Shirt',
    items: ['Women', 'Men', 'Kids', 'Shoes', 'Bags', 'Accessories'],
  },
  {
    label: 'Bikes',
    icon: 'Bike',
    items: ['Road bikes', 'Mountain bikes', 'Kids bikes', 'E-bikes', 'Accessories'],
  },
  {
    label: 'Home',
    icon: 'Lamp',
    items: ['Lighting', 'Kitchenware', 'Decor', 'Rugs & textiles', 'Appliances'],
  },
  {
    label: 'Garden',
    icon: 'Flower2',
    items: ['Plants', 'Pots & planters', 'Tools', 'Outdoor furniture', 'BBQ'],
  },
  {
    label: 'Kids',
    icon: 'Baby',
    items: ['Toys', 'Prams & buggies', 'Clothing', 'Nursery', 'Books'],
  },
  {
    label: 'Toys',
    icon: 'ToyBrick',
    items: ['Board games', 'Building sets', 'Outdoor', 'Educational', 'Figures'],
  },
  {
    label: 'Books',
    icon: 'BookOpen',
    items: ['Fiction', 'Non-fiction', 'Kids', 'Textbooks', 'Comics'],
  },
  {
    label: 'Sports',
    icon: 'Dumbbell',
    items: ['Fitness', 'Cycling', 'Camping', 'Team sports', 'Water sports'],
  },
  {
    label: 'Tools',
    icon: 'Wrench',
    items: ['Power tools', 'Hand tools', 'Garden tools', 'Ladders', 'Storage'],
  },
  {
    label: 'Beauty',
    icon: 'Sparkles',
    items: ['Skincare', 'Makeup', 'Fragrance', 'Hair', 'Tools'],
  },
  {
    label: 'Pet',
    icon: 'PawPrint',
    items: ['Dogs', 'Cats', 'Small pets', 'Beds & crates', 'Accessories'],
  },
  {
    label: 'Vintage',
    icon: 'Gem',
    items: ['Furniture', 'Clothing', 'Homeware', 'Vinyl', 'Collectibles'],
  },
  {
    label: 'Free stuff',
    icon: 'Gift',
    items: ['Everything free', 'Furniture', 'Kids & baby', 'Garden', 'Household'],
  },
];
