// Chapter content, timing and metadata. Scene modules are lazy-loaded.
export const CHAPTERS = [
  {
    id: 'birth', n: 1, numeral: 'I', letter: 'Α', kicker: 'Chapter One',
    title: 'Birth of the Greek World', sub: 'Islands, sea and early settlements',
    duration: 34, mood: 'dawn',
    captions: [
      { t: 2.0, d: 6.2, text: 'A land of rock and light, held between mountains and sea.' },
      { t: 8.8, d: 7.2, text: 'Few places in Greece are far from the coast. The sea was less a barrier than a road.' },
      { t: 16.6, d: 7.6, text: 'Fishers, farmers and traders settled the bays and islands, growing olives, grapes and grain.' },
      { t: 24.6, d: 8.6, text: 'Before the famous cities came the Minoans of Crete and the Mycenaeans of the mainland — the first palace worlds.' },
    ],
    load: () => import('../scenes/birth.js'),
  },
  {
    id: 'myths', n: 2, numeral: 'II', letter: 'Β', kicker: 'Chapter Two',
    title: 'Myths and Gods', sub: 'Mount Olympus and a world of myth',
    duration: 34, mood: 'olympus',
    captions: [
      { t: 2.0, d: 6.0, text: 'To explain thunder, harvest, love and fate, the Greeks told stories.' },
      { t: 8.6, d: 7.4, text: 'Twelve great gods were said to rule from Mount Olympus, with Zeus, master of the sky, at their head.' },
      { t: 16.6, d: 8.0, text: 'Prometheus carried fire to humankind. Winged Pegasus, born of Medusa’s blood, crossed the clouds.' },
      { t: 25.0, d: 8.4, text: 'The myths were not scripture. They were a shared imagination — the language Greeks used to understand themselves.' },
    ],
    load: () => import('../scenes/myths.js'),
  },
  {
    id: 'polis', n: 3, numeral: 'III', letter: 'Γ', kicker: 'Chapter Three',
    title: 'The Polis', sub: 'Cities, citizens and a shared life',
    duration: 34, mood: 'agora',
    captions: [
      { t: 2.0, d: 7.0, text: 'From about the 8th century BCE, Greeks organised life around the polis: a city and its countryside, ruled as one community.' },
      { t: 9.6, d: 6.6, text: 'Hundreds of poleis arose, each with its own laws, patron god and army — and often at odds with its neighbours.' },
      { t: 16.8, d: 6.4, text: 'At the heart of each stood the agora: market, meeting place and stage for public argument.' },
      { t: 23.8, d: 9.2, text: 'Citizens spoke, traded and voted there. But citizenship was narrow: women, foreigners and enslaved people were shut out.' },
    ],
    load: () => import('../scenes/polis.js'),
  },
  {
    id: 'athens-sparta', n: 4, numeral: 'IV', letter: 'Δ', kicker: 'Chapter Four',
    title: 'Athens and Sparta', sub: 'Two visions, one Greek world',
    duration: 36, mood: 'contrast',
    captions: [
      { t: 2.0, d: 5.8, text: 'Two poleis, two answers to the question of how to live.' },
      { t: 8.4, d: 8.0, text: 'Athens prized speech, art and learning. After 508 BCE its citizens ran the city through democracy.' },
      { t: 17.0, d: 8.4, text: 'Sparta prized discipline. Boys began military training at seven, and the whole city was built to serve its army.' },
      { t: 26.0, d: 8.8, text: 'Rivals in politics and war — yet both spoke Greek, honoured the same gods and gathered at the same games.' },
    ],
    load: () => import('../scenes/athens-sparta.js'),
  },
  {
    id: 'persian-wars', n: 5, numeral: 'V', letter: 'Ε', kicker: 'Chapter Five',
    title: 'The Persian Wars', sub: 'A struggle for freedom',
    duration: 38, mood: 'war',
    captions: [
      { t: 2.0, d: 6.4, text: 'In 490 BCE the Persian Empire, the largest the world had yet seen, sailed to punish Athens.' },
      { t: 9.2, d: 6.2, text: 'At Marathon, Athenian hoplites charged and held. The invaders withdrew.' },
      { t: 16.2, d: 9.0, text: 'A decade later Persia returned in force. At Thermopylae, Leonidas and a few thousand Greeks held a narrow pass — until they were outflanked.' },
      { t: 26.0, d: 10.2, text: 'Athens burned. Yet at Salamis, Greek triremes trapped the Persian fleet in narrow waters, and the invasion turned.' },
    ],
    load: () => import('../scenes/persian-wars.js'),
  },
  {
    id: 'philosophy', n: 6, numeral: 'VI', letter: 'Ϛ', kicker: 'Chapter Six',
    title: 'Philosophy and Drama', sub: 'Ideas, questions and human nature',
    duration: 36, mood: 'grove',
    captions: [
      { t: 2.0, d: 7.4, text: 'In the 5th century BCE, Athens turned questions into a way of life: What is justice? What is a good life?' },
      { t: 9.8, d: 6.0, text: 'Socrates asked. Plato wrote. Aristotle classified the world.' },
      { t: 16.8, d: 8.4, text: 'In the theatre, tragedy and comedy held up a mirror: masked actors, a chorus, and an audience of thousands.' },
      { t: 26.0, d: 8.6, text: 'Aeschylus, Sophocles, Euripides and Aristophanes returned to one subject — what it means to be human.' },
    ],
    load: () => import('../scenes/philosophy.js'),
  },
  {
    id: 'alexander', n: 7, numeral: 'VII', letter: 'Ζ', kicker: 'Chapter Seven',
    title: 'Alexander', sub: 'A bold vision, a wider world',
    duration: 38, mood: 'conquest',
    captions: [
      { t: 2.0, d: 6.0, text: 'In 336 BCE Alexander became king of Macedon, at the age of twenty.' },
      { t: 9.0, d: 8.6, text: 'In little more than a decade he crossed Anatolia, Egypt and Persia, and led his army to the borders of India.' },
      { t: 18.6, d: 8.0, text: 'Cities named Alexandria rose along his path. Greek language and ideas travelled with them.' },
      { t: 27.6, d: 9.6, text: 'He died in Babylon in 323 BCE, aged thirty-two. His empire broke apart — but the Hellenistic world endured.' },
    ],
    load: () => import('../scenes/alexander.js'),
  },
  {
    id: 'legacy', n: 8, numeral: 'VIII', letter: 'Η', kicker: 'Chapter Eight',
    title: 'Legacy', sub: 'Ideas that still shape our world',
    duration: 38, mood: 'sunset',
    captions: [
      { t: 2.0, d: 7.0, text: 'Democracy, theatre, philosophy, history, geometry — the words are Greek, and so are many of the ideas.' },
      { t: 9.6, d: 7.6, text: 'Hippocrates separated medicine from magic. Euclid built geometry from first principles. Herodotus set out to record the past.' },
      { t: 17.8, d: 7.4, text: 'Marble columns still front our courts and libraries. The Olympic Games, revived in 1896, still gather the world.' },
      { t: 26.0, d: 7.0, text: 'What remains is not only stone. It is the habit of asking questions.' },
    ],
    load: () => import('../scenes/legacy.js'),
  },
];

// 24px line icons used on the timeline and chapter menu
export const ICONS = {
  birth: '<path d="M3 16c4 3 11 3 18-3"/><path d="M5 13.5 19 11"/><path d="M12 11V4l6 4h-6"/><path d="M2 20c3 1.5 6 1.5 9 0s6-1.5 9 0"/>',
  myths: '<path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6z"/>',
  polis: '<path d="M5 20h14M7 20V9m10 11V9M4 9h16M5 6h14M12 3l8 3H4z"/>',
  'athens-sparta': '<path d="M1.5 19 6 7l4.5 12M3.5 14.5h5M13.5 19 18 7l4.5 12"/>',
  'persian-wars': '<path d="M5 20v-8c0-5 3.5-8 7.5-8s6.5 3 6.5 8v8M9 20v-4h6v4M12 4c0-2 4-3 6-1"/>',
  philosophy: '<path d="M5 4.5h14v8c0 4.5-3.5 7.5-7 7.5s-7-3-7-7.5z"/><path d="M9 10h1.5m3 0H15M9.5 14.5q2.5 2.5 5 0"/>',
  alexander: '<path d="M7 21l2-8c0-4 2-7 6-9l3 2 2 3-3 2-2-1-2 3 1 8"/><circle cx="16" cy="8" r=".6"/>',
  legacy: '<path d="M4 21C9 15 14 10 21 3"/><path d="M10 15c-2-1-4-1-5-3 2-1 4 0 5 3zM14.5 10.5c-2-2-2-4-2-6 2 1 3.5 3 2 6zM17.5 7c0-2 1.5-3.500 3.500-4"/>',
};

export const TOTAL = CHAPTERS.reduce((a, c) => a + c.duration, 0);
