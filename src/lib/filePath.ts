import path from 'path';
import { existsSync } from 'fs';

export function resolvePublicFilePath(relativeUrl: string): string {
  const cleanUrl = relativeUrl.replace(/^\/+/, '').replace(/^api\/files\//, '').replace(/^\/+/, '');
  const cwd = process.cwd();
  
  // 1. Check process.cwd()/public/...
  const primaryPath = path.join(cwd, 'public', cleanUrl);
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  // 2. Check process.cwd()/.next/standalone/public/...
  const standalonePath = path.join(cwd, '.next', 'standalone', 'public', cleanUrl);
  if (existsSync(standalonePath)) {
    return standalonePath;
  }

  // 3. Parent path if process.cwd() is inside .next/standalone
  if (cwd.includes(path.join('.next', 'standalone'))) {
    const parentRoot = cwd.split(path.join('.next', 'standalone'))[0];
    const parentPath = path.join(parentRoot, 'public', cleanUrl);
    if (existsSync(parentPath)) {
      return parentPath;
    }
  }

  return primaryPath;
}
