// 주소창의 해시를 화면 한 개로 푼다. 서버 라우팅을 건드리지 않으려고 해시를 쓴다
// app.ts의 정적 서빙은 Phase 0가 고정한 공용 골격이라 history API용 되돌림 규칙을 넣을 수 없다

export type Route =
  | { name: 'cases' }
  | { name: 'setup'; tcId: string }
  | { name: 'runs' }
  | { name: 'run'; runId: number }
  | { name: 'item'; runId: number; historyId: number }
  | { name: 'unknown'; hash: string };

export function route(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter((part) => part !== '');

  if (parts.length === 0 || (parts[0] === 'cases' && parts.length === 1)) return { name: 'cases' };

  if (parts[0] === 'cases' && parts.length === 3 && parts[2] === 'run') {
    return { name: 'setup', tcId: decodeURIComponent(parts[1]!) };
  }

  if (parts[0] === 'runs') {
    if (parts.length === 1) return { name: 'runs' };

    const runId = Number(parts[1]);
    if (Number.isInteger(runId)) {
      if (parts.length === 2) return { name: 'run', runId };

      const historyId = Number(parts[3]);
      if (parts.length === 4 && parts[2] === 'items' && Number.isInteger(historyId)) {
        return { name: 'item', runId, historyId };
      }
    }
  }

  return { name: 'unknown', hash };
}
