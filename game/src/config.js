// Dapur Kilat — config: recipes, ingredients, tuning.
// All original content for the make.fun "best cooking game" bounty.

export const VIEW = { w: 1280, h: 720 };

export const SHIFT_SECONDS = 120;
export const MAX_ORDERS = 3;
export const MAX_HEARTS = 3;
export const GRILL_SLOTS = 2;

// Ingredient ids in bin order (keys 1..7).
export const INGREDIENTS = [
  { id: 'bunBottom', key: '1', name: 'Roti Bawah', color: '#e8a34c', price: 1 },
  { id: 'patty', key: '2', name: 'Patty', color: '#7a4a21', price: 3 },
  { id: 'lettuce', key: '3', name: 'Selada', color: '#58b368', price: 1 },
  { id: 'tomato', key: '4', name: 'Tomat', color: '#e2483d', price: 1 },
  { id: 'cheese', key: '5', name: 'Keju', color: '#ffc93c', price: 2 },
  { id: 'sauce', key: '6', name: 'Saus', color: '#ff8c42', price: 1 },
  { id: 'bunTop', key: '7', name: 'Roti Atas', color: '#e8a34c', price: 1 },
];

export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Recipes the order board can ask for. `build` is the exact stack order,
// bottom to top. Names are original, in Bahasa Indonesia with an English tag.
export const RECIPES = [
  {
    id: 'klasik',
    name: 'Burger Klasik',
    en: 'Classic Burger',
    build: ['bunBottom', 'patty', 'lettuce', 'tomato', 'bunTop'],
    coins: 12,
    patience: 45,
  },
  {
    id: 'keju',
    name: 'Burger Keju Leleh',
    en: 'Melty Cheese Burger',
    build: ['bunBottom', 'patty', 'cheese', 'lettuce', 'bunTop'],
    coins: 15,
    patience: 50,
  },
  {
    id: 'dobel',
    name: 'Burger Dobel Daging',
    en: 'Double Trouble',
    build: ['bunBottom', 'patty', 'cheese', 'patty', 'tomato', 'bunTop'],
    coins: 22,
    patience: 60,
  },
  {
    id: 'saus',
    name: 'Burger Saus Pedas',
    en: 'Spicy Sauce Burger',
    build: ['bunBottom', 'patty', 'sauce', 'lettuce', 'tomato', 'bunTop'],
    coins: 18,
    patience: 55,
  },
  {
    id: 'sayur',
    name: 'Burger Sayur Segar',
    en: 'Garden Fresh Burger',
    build: ['bunBottom', 'lettuce', 'tomato', 'cheese', 'sauce', 'bunTop'],
    coins: 14,
    patience: 48,
  },
  {
    id: 'raja',
    name: 'Burger Raja Kilat',
    en: 'Lightning King Burger',
    build: ['bunBottom', 'patty', 'cheese', 'patty', 'sauce', 'lettuce', 'tomato', 'bunTop'],
    coins: 30,
    patience: 70,
  },
];

// Grill tuning (seconds).
export const GRILL = {
  cookTime: 6, // raw -> perfectly cooked
  burnTime: 11, // cooked -> burnt
};

// Score tuning.
export const SCORE = {
  serveBase: 100,
  patienceBonusMax: 50, // extra for serving fast
  comboStep: 25, // per combo level, capped
  comboCap: 150,
  wrongPenalty: 40,
  burnPenalty: 10,
  expiredPenalty: 0, // losing a heart is penalty enough
};

// Layout rectangles (canvas coordinates, 1280x720).
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  board: { x: 16, y: 80, w: 300, h: 400 },
  grill: { x: 348, y: 96, w: 300, h: 150 },
  plate: { x: 348, y: 268, w: 300, h: 190 },
  bell: { x: 668, y: 96, w: 170, h: 150 },
  trash: { x: 668, y: 268, w: 170, h: 90 },
  tips: { x: 668, y: 372, w: 170, h: 86 },
  bins: { x: 16, y: 500, w: 1248, h: 130 },
  help: { x: 16, y: 644, w: 1248, h: 60 },
};

export const PALETTE = {
  wallTop: '#f7e8c9',
  wallBottom: '#efd9a7',
  tile: '#e8c98f',
  counter: '#8a5a2b',
  counterEdge: '#6e451f',
  steel: '#c9ced6',
  steelDark: '#9aa1ad',
  paper: '#fff8e7',
  ink: '#3a2a18',
  red: '#d64541',
  green: '#3f9e4d',
  gold: '#f5b301',
  cream: '#fff3d6',
};
