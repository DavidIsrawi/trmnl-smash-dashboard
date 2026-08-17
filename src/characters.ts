import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CharacterData, CharactersJson } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const characterMap = new Map<number, CharacterData>();

/**
 * Locate the character dataset.
 *
 * `npm run build` copies `src/data` next to the compiled output, so the
 * colocated copy is the expected hit for both `dist/` (node) and `src/` (tsx).
 * The source tree is kept as a fallback so a `dist/` produced without the
 * `copy:assets` step — a bare `tsc`, or an Azure Oryx build that runs its own
 * compile — still resolves instead of failing with a bare ENOENT.
 */
function resolveDataPath(): string {
  const candidates = [
    path.join(__dirname, "data", "smash-characters.json"),
    path.join(__dirname, "..", "src", "data", "smash-characters.json"),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      `smash-characters.json not found (looked in: ${candidates.join(", ")}). ` +
        "Run `npm run build` to copy src/data alongside the compiled output.",
    );
  }

  return found;
}

function loadCharacters(): void {
  if (characterMap.size > 0) return;

  const raw = fs.readFileSync(resolveDataPath(), "utf-8");
  const data: CharactersJson = JSON.parse(raw);

  for (const char of data.entities.character) {
    characterMap.set(char.id, {
      id: char.id,
      name: char.name,
      images: char.images
        .filter((img) => img.type === "icon" || img.type === "stockIcon")
        .map((img) => ({
          id: img.id,
          type: img.type as "icon" | "stockIcon",
          url: img.url,
        })),
    });
  }
}

export function getCharacterName(charId: number): string {
  loadCharacters();
  return characterMap.get(charId)?.name ?? `Unknown (${charId})`;
}

export function getCharacterStockIcon(charId: number): string | undefined {
  loadCharacters();
  return characterMap
    .get(charId)
    ?.images.find((img) => img.type === "stockIcon")?.url;
}

export function getCharacterIcon(charId: number): string | undefined {
  loadCharacters();
  return characterMap.get(charId)?.images.find((img) => img.type === "icon")
    ?.url;
}
