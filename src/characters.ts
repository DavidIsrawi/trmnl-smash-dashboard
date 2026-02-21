import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CharacterData, CharactersJson } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const characterMap = new Map<number, CharacterData>();

function loadCharacters(): void {
  if (characterMap.size > 0) return;

  // Works from both src/ (tsx) and dist/ (node): both resolve to <project>/src/data/
  const jsonPath = path.join(__dirname, '..', 'src', 'data', 'smash-characters.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data: CharactersJson = JSON.parse(raw);

  for (const char of data.entities.character) {
    characterMap.set(char.id, {
      id: char.id,
      name: char.name,
      images: char.images
        .filter((img) => img.type === 'icon' || img.type === 'stockIcon')
        .map((img) => ({ id: img.id, type: img.type as 'icon' | 'stockIcon', url: img.url })),
    });
  }
}

export function getCharacterName(charId: number): string {
  loadCharacters();
  return characterMap.get(charId)?.name ?? `Unknown (${charId})`;
}

export function getCharacterStockIcon(charId: number): string | undefined {
  loadCharacters();
  return characterMap.get(charId)?.images.find((img) => img.type === 'stockIcon')?.url;
}

export function getCharacterIcon(charId: number): string | undefined {
  loadCharacters();
  return characterMap.get(charId)?.images.find((img) => img.type === 'icon')?.url;
}
