import type { MeetPointCategory } from './safety.types.js';

export interface MeetPointSeed {
  name: string;
  address: string;
  category: MeetPointCategory;
  lat: number;
  lng: number;
}

// Curated, publicly-staffed safe meeting spots around Liverpool for pickups.
export const MEET_POINT_SEED: MeetPointSeed[] = [
  {
    name: 'St Anne Street Police Station',
    address: 'St Anne Street, Liverpool L3 3JG',
    category: 'policeStation',
    lat: 53.4147,
    lng: -2.9772,
  },
  {
    name: 'Speke Police Station',
    address: 'Woodend Avenue, Speke, Liverpool L24 9NR',
    category: 'policeStation',
    lat: 53.3401,
    lng: -2.8598,
  },
  {
    name: 'Liverpool Central Library',
    address: 'William Brown Street, Liverpool L3 8EW',
    category: 'library',
    lat: 53.4094,
    lng: -2.9786,
  },
  {
    name: 'Allerton Library',
    address: 'Allerton Road, Liverpool L18 2DA',
    category: 'library',
    lat: 53.3732,
    lng: -2.9081,
  },
  {
    name: 'Toxteth Library',
    address: 'Windsor Street, Liverpool L8 1XF',
    category: 'library',
    lat: 53.3861,
    lng: -2.9642,
  },
  {
    name: 'Tesco Extra Liverpool',
    address: 'Hanover Street, Liverpool L1 4AB',
    category: 'supermarket',
    lat: 53.4029,
    lng: -2.9819,
  },
  {
    name: 'Sainsburys East Prescot Road',
    address: 'East Prescot Road, Liverpool L14 5NR',
    category: 'supermarket',
    lat: 53.4132,
    lng: -2.9089,
  },
  {
    name: 'Kensington Community Centre',
    address: 'Beech Street, Liverpool L7 8DT',
    category: 'communityCentre',
    lat: 53.4113,
    lng: -2.9503,
  },
];
