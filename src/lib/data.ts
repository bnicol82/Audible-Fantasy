export type Audiobook = {
  id: string;
  title: string;
  author: string;
  narrator: string;
  series?: string;
  seriesNumber?: number;
  duration: string;
  rating: number;
  reviews: number;
  description: string;
  coverUrl: string;
  genre: string;
  featured?: boolean;
};

export const genres = [
  "All",
  "Epic Fantasy",
  "Dark Fantasy",
  "Urban Fantasy",
  "High Fantasy",
  "Grimdark",
] as const;

export const audiobooks: Audiobook[] = [
  {
    id: "1",
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    narrator: "Nick Podehl",
    series: "Kingkiller Chronicle",
    seriesNumber: 1,
    duration: "27h 55m",
    rating: 4.8,
    reviews: 89432,
    description:
      "The tale of Kvothe, from his childhood in a troupe of traveling players to his daring bid to enter a legendary school of magic.",
    coverUrl:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
    genre: "Epic Fantasy",
    featured: true,
  },
  {
    id: "2",
    title: "The Way of Kings",
    author: "Brandon Sanderson",
    narrator: "Kate Reading & Michael Kramer",
    series: "The Stormlight Archive",
    seriesNumber: 1,
    duration: "45h 29m",
    rating: 4.9,
    reviews: 124567,
    description:
      "Roshar is a world of stone and storms. Uncanny tempests sweep the terrain, and wars rage across the land.",
    coverUrl:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop",
    genre: "Epic Fantasy",
    featured: true,
  },
  {
    id: "3",
    title: "The Priory of the Orange Tree",
    author: "Samantha Shannon",
    narrator: "Katie Scarfe",
    duration: "27h 24m",
    rating: 4.5,
    reviews: 34521,
    description:
      "A world divided. A queendom without an heir. An ancient enemy awakens.",
    coverUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    genre: "High Fantasy",
  },
  {
    id: "4",
    title: "The Fifth Season",
    author: "N.K. Jemisin",
    narrator: "Robin Miles",
    series: "The Broken Earth",
    seriesNumber: 1,
    duration: "15h 54m",
    rating: 4.7,
    reviews: 67890,
    description:
      "This is the way the world ends. For the last time. A woman searches for her daughter in a world of constant seismic catastrophe.",
    coverUrl:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop",
    genre: "Dark Fantasy",
  },
  {
    id: "5",
    title: "The Lies of Locke Lamora",
    author: "Scott Lynch",
    narrator: "Michael Page",
    series: "Gentleman Bastard",
    seriesNumber: 1,
    duration: "21h 58m",
    rating: 4.6,
    reviews: 45678,
    description:
      "An orphan's life is hard, but when you're a member of the Gentlemen Bastards, it's also dangerous.",
    coverUrl:
      "https://images.unsplash.com/photo-1589998055856-a0abc5359b1a?w=400&h=600&fit=crop",
    genre: "Grimdark",
  },
  {
    id: "6",
    title: "Daughter of the Moon Goddess",
    author: "Sue Lynn Tan",
    narrator: "Natalie Naudus",
    duration: "17h 32m",
    rating: 4.4,
    reviews: 23456,
    description:
      "Inspired by the legend of Chang'e, this is a young woman's quest to free her mother and become a goddess.",
    coverUrl:
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=600&fit=crop",
    genre: "High Fantasy",
  },
  {
    id: "7",
    title: "City of Stairs",
    author: "Robert Jackson Bennett",
    narrator: "Susan Duerden",
    series: "Divine Cities",
    seriesNumber: 1,
    duration: "13h 45m",
    rating: 4.3,
    reviews: 18934,
    description:
      "In a city where the gods once walked, a spy uncovers a conspiracy that could reignite a holy war.",
    coverUrl:
      "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&h=600&fit=crop",
    genre: "Urban Fantasy",
  },
  {
    id: "8",
    title: "The Poppy War",
    author: "R.F. Kuang",
    narrator: "Emily Woo Zeller",
    series: "The Poppy War",
    seriesNumber: 1,
    duration: "18h 56m",
    rating: 4.6,
    reviews: 56789,
    description:
      "A war orphan rises through the ranks of an elite military academy, only to discover the true cost of power.",
    coverUrl:
      "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=600&fit=crop",
    genre: "Grimdark",
  },
];
