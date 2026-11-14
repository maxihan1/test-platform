// 'YYYY-MM-DD' 날짜에 날 수를 더한다 — 대시보드 · 프로젝트 QA 리포트 · 화면이 같이 쓴다 (도메인/리포팅 §8.12)

// UTC 로 계산하면 서머타임이 날짜를 건너뛰게 만들지 못한다
export function 날짜더하기(day: string, 일수: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 일수)).toISOString().slice(0, 10);
}
