export interface RecentItem {
  type: 'project' | 'task';
  id: string;
  boardId: string;
  time: number;
}

const KEY = 'waypoint_recent_v1';
const LIMIT = 12;

export function getRecent(): RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function pushRecent(item: Omit<RecentItem, 'time'>) {
  try {
    const next = [{ ...item, time: Date.now() }, ...getRecent().filter(r => !(r.type === item.type && r.id === item.id))].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
