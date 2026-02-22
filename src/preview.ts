import fs from 'fs';
import path from 'path';
import { Liquid } from 'liquidjs';
import type { SmashPluginData } from './types.js';

const engine = new Liquid();

const mockData: SmashPluginData = {
  user: {
    gamerTag: 'Dahveed',
    images: [
      {
        id: '2948184',
        url: 'https://images.start.gg/images/user/1114021/image-d904c0bd0ca3c74cc0242188571d3fa9.jpg?ehk=FeHLFGUXMAMW8SYyrwPAygviagn99IX2%2BWHsLN2jD0U%3D&ehkOptimized=cWpUBDh91HOjuhqZgoqR7fBnWXlASKrljCjWuspmb8A%3D',
        type: 'profile'
      }
    ]
  },
  season: {
    win_rate: 65,
    wins: 47,
    losses: 25,
    top_chars: [
      { name: 'King K. Rool', usage_count: 66, image_url: 'https://images.start.gg/images/character/1407/image-649a64550b8848a082dbf9b8d6e545d1.png?ehk=RHaPklJczUB21bhnLnALkwi4XQXxRlZdpJUbo1S7SMk%3D&ehkOptimized=F4qN1P5o3OPxGHmBl4MA9SfxS2zLdSrbZ2%2FRLFYoILE%3D' },
      { name: 'R.O.B.', usage_count: 6, image_url: 'https://images.start.gg/images/character/1323/image-ff45bd739bb70c5b557247b071757f9c.png?ehk=GTLNejSa6BYTPzaBO%2FThijmCIzfj6tJ5dsZcyOBCZu8%3D&ehkOptimized=T8O79GGv3DdxUB5LDUeRNy9G6RzpR4GeLlQBWulkrFE%3D' }
    ]
  },
  next_tournament: {
    name: 'Genesis X',
    days_remaining: 14,
    image_url: 'https://images.start.gg/images/tournament/756975/image-0c9da33e1bcad42e0104a43f02623183.png'
  },
  latest_result: {
    rank: 7,
    upset_factor: 3,
    event_name: 'Ultimate Singles (ALTERNATE STAGE LIST)',
    tournament_name: 'Octagon #150',
    date: 'Feb 17',
    location: 'Seattle',
    entrants: 46,
    wins: 5,
    losses: 2,
    char_image_url: 'https://images.start.gg/images/character/1407/image-c8adee7aaf47b788e22ad79842aba06c.png?ehk=y33xj%2BHmrlUyx%2BaIocE0rt7gQpFEy%2FOh%2BI88dbevV0U%3D&ehkOptimized=mEtPbfhGopCXphR7tniuMF%2BXpiG10eWejj331QSrRzQ%3D',
    char_played: 'King K. Rool'
  },
  previous_result: {
    rank: 3,
    upset_factor: 1,
    event_name: 'Ultimate Doubles',
    tournament_name: 'Octagon #150',
    date: 'Feb 17',
    location: 'Seattle',
    entrants: 20,
    wins: 3,
    losses: 1,
    char_played: 'King K. Rool'
  }
};

async function generatePreview() {
  try {
    const templatePath = path.resolve('trmnl_template.liquid');
    const template = fs.readFileSync(templatePath, 'utf8');

    const rendered = await engine.parseAndRender(template, mockData);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=800, height=480, initial-scale=1.0">
    <title>TRMNL Smash Plugin Preview</title>
    <link rel="stylesheet" href="https://usetrmnl.com/css/latest/plugins.css">
</head>
<body class="environment trmnl">
${rendered}
</body>
</html>`;

    fs.writeFileSync('preview.html', html);
    console.log('Preview generated at preview.html');
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

generatePreview();
