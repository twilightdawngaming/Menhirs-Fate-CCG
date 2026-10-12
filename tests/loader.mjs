// Maps the browser-style absolute imports (/src/...) onto the project filesystem
// so the client modules can be exercised in Node.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ROOT = pathToFileURL(path.join(process.cwd(), '/')).href;
export function resolve(specifier, context, next) {
  if (specifier.startsWith('/src/')) return next(ROOT + specifier.slice(1), context);
  return next(specifier, context);
}
