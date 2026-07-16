import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { createListing } from './listing.service.js';
import { listCategories } from './category.service.js';
import type { ListingCondition, ListingType } from './listing.types.js';

// Dummy marketplace data for local/demo use. Photos are real remote images
// (Unsplash) whose URL is stored as the S3 object key, so the web client can
// render them directly until real S3 storage is wired.

interface ListingSeed {
  title: string;
  description: string;
  categorySlug: string;
  condition: ListingCondition;
  listingType: ListingType;
  pricePence: number | null;
  photos: string[]; // Unsplash photo IDs
}

const LIVERPOOL = { lat: 53.4084, lng: -2.9916 };

const LISTINGS: ListingSeed[] = [
  {
    title: 'Vintage road bike — recently serviced',
    description:
      'Classic steel-frame road bike, fully serviced last month with new tyres and brake pads. Rides beautifully. Collection from L1.',
    categorySlug: 'sports-outdoors',
    condition: 'good',
    listingType: 'sell',
    pricePence: 12000,
    photos: ['1485965120184-e220f721d03e', '1532298229144-0ec0c57515c7'],
  },
  {
    title: 'Two-seater linen sofa',
    description:
      'Comfortable two-seater in oatmeal linen. A few marks but plenty of life left. Free to a good home — must collect (we can help load).',
    categorySlug: 'furniture',
    condition: 'good',
    listingType: 'giveaway',
    pricePence: null,
    photos: ['1555041469-a586c61ea9bc', '1493663284031-b7e3aefcae8e'],
  },
  {
    title: 'Mirrorless camera + 50mm lens',
    description:
      'Great starter mirrorless setup. Body has light use, 50mm f/1.8 lens included. Boxed with charger and strap.',
    categorySlug: 'electronics',
    condition: 'likeNew',
    listingType: 'sell',
    pricePence: 34500,
    photos: ['1516035069371-29a1b244cc32', '1519183071298-a2962feb14f4'],
  },
  {
    title: 'Running trainers, worn twice',
    description:
      'Bought the wrong size. Worn twice indoors, basically new. UK 9. Smoke-free home.',
    categorySlug: 'clothing',
    condition: 'likeNew',
    listingType: 'sell',
    pricePence: 2800,
    photos: ['1542291026-7eec264c27ff', '1460353581641-37baddab0fa2'],
  },
  {
    title: 'Box of paperback novels',
    description:
      'Around 30 paperbacks — crime, sci-fi and a few classics. Clearing shelves, all free to whoever wants them.',
    categorySlug: 'books-media',
    condition: 'good',
    listingType: 'giveaway',
    pricePence: null,
    photos: ['1512820790803-83ca734da794', '1524578271613-d550eacf6090'],
  },
  {
    title: 'Large monstera in ceramic pot',
    description:
      'Healthy, well-established monstera about 1m tall in a heavy ceramic pot. Too big for our flat now.',
    categorySlug: 'garden-diy',
    condition: 'good',
    listingType: 'sell',
    pricePence: 1500,
    photos: ['1614594975525-e45190c55d0b', '1466692476868-aef1dfb1e735'],
  },
  {
    title: 'Acoustic guitar with soft case',
    description:
      'Full-size acoustic, lovely warm tone. Small scratch on the back (pictured). Comes with a padded soft case.',
    categorySlug: 'electronics',
    condition: 'good',
    listingType: 'sell',
    pricePence: 8500,
    photos: ['1510915361894-db8b60106cb1', '1493225457124-a3eb161ffa5f'],
  },
  {
    title: 'Solid oak dining chairs (set of 4)',
    description:
      'Sturdy solid-oak chairs, some wear consistent with age. Selling as a set of four.',
    categorySlug: 'furniture',
    condition: 'fair',
    listingType: 'sell',
    pricePence: 6000,
    photos: ['1503602642458-232111445657', '1567538096630-e0c55bd6374c'],
  },
  {
    title: 'Over-ear headphones',
    description:
      'Wireless over-ear headphones with great battery life. Like new, boxed with cable.',
    categorySlug: 'electronics',
    condition: 'likeNew',
    listingType: 'sell',
    pricePence: 4200,
    photos: ['1505740420928-5e560c06d30e', '1484704849700-f032a568e944'],
  },
  {
    title: 'Canvas hiking backpack, 40L',
    description:
      'Durable 40L canvas backpack, used on a couple of trips. Loads of pockets, very comfy.',
    categorySlug: 'sports-outdoors',
    condition: 'good',
    listingType: 'sell',
    pricePence: 3000,
    photos: ['1553062407-98eeb64c6a62', '1622260614153-03223fb72052'],
  },
  {
    title: 'Kids wooden train set',
    description:
      'Big bag of wooden train track and trains, compatible with the popular brands. Our little one has outgrown it — free to a family who’ll love it.',
    categorySlug: 'toys-games',
    condition: 'good',
    listingType: 'giveaway',
    pricePence: null,
    photos: ['1558060370-d644479cb6f7', '1516981879613-9f5da904015f'],
  },
  {
    title: 'Ceramic table lamp',
    description:
      'Stylish ceramic table lamp with a linen shade. Works perfectly, just redecorating.',
    categorySlug: 'home-kitchen',
    condition: 'likeNew',
    listingType: 'sell',
    pricePence: 1800,
    photos: ['1513506003901-1e6a229e2d15', '1507473885765-e6ed057f782c'],
  },
];

async function ensureDemoSeller(db: PrismaClient): Promise<string> {
  const email = 'demo.seller@letscycle.dev';
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const user = await db.user.create({
    data: {
      email,
      displayName: 'LetsCycle Demo',
      cognitoSub: 'demo-seller-sub',
      accountStatus: 'active',
    },
  });
  return user.id;
}

/** Idempotent: seeds demo listings + photos once for the demo seller. */
export async function seedDemoListings(db: PrismaClient = getDb()): Promise<number> {
  const sellerId = await ensureDemoSeller(db);

  const existing = await db.listing.count({ where: { sellerId } });
  if (existing > 0) return 0;

  const categories = await listCategories(db);
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let created = 0;
  for (const [index, spec] of LISTINGS.entries()) {
    const categoryId = bySlug.get(spec.categorySlug);
    if (!categoryId) continue;

    const detail = await createListing(
      {
        sellerId,
        title: spec.title,
        description: spec.description,
        categoryId,
        condition: spec.condition,
        listingType: spec.listingType,
        pricePence: spec.pricePence,
        location: {
          lat: LIVERPOOL.lat + (index % 4) * 0.004 - 0.006,
          lng: LIVERPOOL.lng + (index % 3) * 0.005 - 0.005,
          accuracyMetres: 50,
        },
        publish: true,
      },
      db,
    );

    for (const [order, photoId] of spec.photos.entries()) {
      const key = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&q=70&sig=${detail.id}-${order}`;
      const s3 = await db.s3Object.create({
        data: {
          bucket: 'letscycle-demo',
          key,
          contentType: 'image/jpeg',
          sizeBytes: 250_000,
          ownerUserId: sellerId,
          lifecycleStatus: 'confirmed',
        },
      });
      await db.listingPhoto.create({
        data: {
          listingId: detail.id,
          s3ObjectId: s3.id,
          displayOrder: order,
          width: 900,
          height: 1125,
        },
      });
    }
    created += 1;
  }

  return created;
}
