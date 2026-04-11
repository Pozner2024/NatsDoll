export interface Review {
  id: number
  text: string
  name: string
  country: string
  rating: number
}

export const REVIEWS: Review[] = [
  {
    id: 1,
    text: 'Absolutely love my clay earrings! The craftsmanship is incredible — each piece feels so unique. Packaged beautifully too.',
    name: 'Emily R.',
    country: 'United Kingdom',
    rating: 5,
  },
  {
    id: 2,
    text: 'Ordered a custom brooch for my mom\'s birthday and she was speechless. The detail work is stunning. Will definitely order again!',
    name: 'Sophie M.',
    country: 'France',
    rating: 5,
  },
  {
    id: 3,
    text: 'Fast shipping, beautiful packaging, and the earrings are even prettier in person. Highly recommend this shop!',
    name: 'Laura K.',
    country: 'Germany',
    rating: 5,
  },
  {
    id: 4,
    text: 'I bought a set of floral pendants and I get compliments every time I wear them. Such delicate and beautiful work.',
    name: 'Anna T.',
    country: 'Poland',
    rating: 5,
  },
  {
    id: 5,
    text: 'The quality exceeded my expectations. Each piece is clearly made with love and attention to detail. A true artist!',
    name: 'Maria S.',
    country: 'Spain',
    rating: 5,
  },
  {
    id: 6,
    text: 'Lovely handmade jewelry. The colors are vibrant and exactly as shown in the photos. Will be back for more!',
    name: 'Chloe B.',
    country: 'Canada',
    rating: 5,
  },
]
