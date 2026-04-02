import type { CardDeck } from './types'

export const DEFAULT_DECKS: CardDeck[] = [
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    type: 'fibonacci',
    cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  },
  {
    id: 'tshirt',
    name: 'T-Shirt Sizes',
    type: 'tshirt',
    cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  },
  {
    id: 'emoji',
    name: 'Emoji',
    type: 'emoji',
    cards: ['😊', '🤔', '😰', '😱', '🎉', '💀', '?'],
  },
]
