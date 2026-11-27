// settingsView 검사 파일들이 같이 쓰는 계정 줄 만들기 도우미

import type { UserRow } from './api.js';

export function 계정(username: string, role: 'member' | 'admin', isActive = true): UserRow {
  return { username, displayName: username, role, dashboard: 'read', isActive, projects: [] };
}
