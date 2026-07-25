import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Single place that knows how tests/ relates to scripts/, so moving either
// directory is a one-line change instead of a hunt through every test file.
const scriptsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');

export function scriptPath(name) {
  return path.join(scriptsDir, name);
}
