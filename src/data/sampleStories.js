export const sampleStories = [
  {
    id: 'glass-garden',
    title: 'The Glass Garden',
    genre: 'Fantasy',
    theme: 'A hidden garden that grows memories',
    progress: 65,
    updated: 'Today',
    cover: '🌿',
    coverClass: 'cover-mint',
    finished: false,
    passages: [
      'The rain had stopped, but every rooftop in Bellweather still shone like a mirror. Mara found the little glass key beneath her grandmother’s favorite rosebush, warm as if someone had just held it.',
      'At the end of the lane, a door appeared in a wall that had been there for a hundred years. The key turned with a soft click. Beyond it, a garden glittered beneath the moon. Each flower held a tiny, turning memory.',
    ],
    choices: [
      'Touch the blue flower that holds a memory of home.',
      'Follow the silver moth deeper into the garden.',
      'Call out to whoever is tending the garden.',
    ],
  },
  {
    id: 'last-train',
    title: 'The Last Train to Elsewhere',
    genre: 'Mystery',
    theme: 'A midnight train with one impossible passenger',
    progress: 100,
    updated: 'Yesterday',
    cover: '🚉',
    coverClass: 'cover-lavender',
    finished: true,
    passages: [
      'At 12:07, a train arrived at a station that had been closed for twenty years. Its windows glowed gold, and every seat was empty except one.',
      'The conductor tipped his cap. “You found the right train,” he said. And for the first time in years, June knew exactly where she was going.',
    ],
    choices: [],
  },
  {
    id: 'ocean-signal',
    title: 'A Signal Beneath the Waves',
    genre: 'Sci-Fi',
    theme: 'A deep-sea station hears a message from the stars',
    progress: 28,
    updated: '3 days ago',
    cover: '🫧',
    coverClass: 'cover-blue',
    finished: false,
    passages: [
      'The signal arrived from below the ocean floor, repeating a sequence no one had heard in the twenty years the station had been online.',
    ],
    choices: ['Send a reply.', 'Trace where the signal is coming from.'],
  },
]

export const genres = [
  { name: 'Fantasy', icon: '✦', tone: 'genre-violet' },
  { name: 'Mystery', icon: '⌕', tone: 'genre-blue' },
  { name: 'Romance', icon: '♡', tone: 'genre-rose' },
  { name: 'Sci-Fi', icon: '✧', tone: 'genre-teal' },
  { name: 'Horror', icon: '☾', tone: 'genre-amber' },
  { name: 'Adventure', icon: '➶', tone: 'genre-green' },
]
