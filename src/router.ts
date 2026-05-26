export type Route =
  | { name: 'home' }
  | { name: 'admin' }
  | { name: 'album'; id: string }
  | { name: 'stats'; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  if (path[0] === 'admin') return { name: 'admin' };
  if (path[0] === 'album' && path[1]) return { name: 'album', id: path[1] };
  if (path[0] === 'stats' && path[1]) return { name: 'stats', id: path[1] };

  return { name: 'home' };
}
