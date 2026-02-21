import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
import type { SmashPluginData } from './types.js';

const engine = new Liquid();

const mockData: SmashPluginData = {
  user: {
    gamerTag: 'MkLeo',
    images: []
  },
  season: {
    win_rate: 65,
    wins: 107,
    losses: 58,
    top_chars: [
      { name: 'Byleth', usage_count: 64, image_url: 'https://images.start.gg/images/character/1539/image-a7b3c5686c170a688cbd22ed36f9dac5.png?ehk=rxCMSD5p27H9Ow5lEGiHRlqDfkvgr6uVgJMAeZEyTAM%3D&ehkOptimized=DdRKJyoOywTpAzHV9xxgQ07bmrqvK18taOfuVZ%2FH5Tw%3D' },
      { name: 'Joker', usage_count: 43, image_url: 'https://images.start.gg/images/character/1453/image-b284052b845b6584f82c5c6d7dd71c55.png?ehk=Ezb4ec1g7C2rjTUyYhFmzupri0qgVmgJdYxT0R7UUNw%3D&ehkOptimized=OW2SIJlReatDRTRJK%2Fb0WECcoOnEZ92O%2FqOijp1neBY%3D' }
    ]
  },
  next_tournament: {
    name: 'Genesis X',
    days_remaining: 14,
    image_url: 'https://images.start.gg/images/tournament/536257/image-a41764722525540306d860160f252445.png'
  },
  latest_result: {
    rank: 1,
    trend: 3,
    event_name: 'Ultimate Singles',
    tournament_name: 'Smash Factor X',
    date: 'Jul 28',
    location: 'Mexico City',
    entrants: 1024,
    char_image_url: 'https://images.start.gg/images/character/1453/image-c20b242549ef4e04a470a5225c1d862c.png?ehk=gYJay258HIpJyvp%2FqZyP42lK7aj8tt4XPlebXsCcziI%3D&ehkOptimized=%2BDDRskb70C1AckH%2BoowpLxLYqbyCLRWjGa2Asd0tS5k%3D',
    char_played: 'Joker'
  },
  previous_result: {
    rank: 4,
    event_name: 'Ultimate Singles',
    tournament_name: 'Super Smash Con',
    date: 'Aug 10',
    entrants: 2500,
    char_played: 'Byleth'
  }
};

async function generatePreview() {
  try {
    const templatePath = path.resolve('trmnl_template.liquid');
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = await engine.parseAndRender(template, mockData);

    fs.writeFileSync('preview.html', html);
    console.log('Preview generated at preview.html');
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

generatePreview();
