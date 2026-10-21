// 응답시간 분포 칸 — 에이전트(apps/perf-agent/src/hist.ts)와 같은 경계로 세고 합쳐 95% 를 다시 센다 (도메인/성능 §3.9 「분포」)
// 에이전트 이미지는 저장소 부품을 담지 않아 kit 로 옮기지 못했다. 두 파일 경계가 같은지는 hist.test.ts 가 본다 (PERF-F1-03 시작 질문)

export const HIST_BUCKETS = 116;

const STEP = Math.log(1.1);

export function bucketOf(ms: number): number {
  if (!(ms > 1)) return 0;
  return Math.min(HIST_BUCKETS - 1, Math.ceil(Math.log(ms) / STEP - 1e-9));
}

export function emptyHist(): number[] {
  return new Array<number>(HIST_BUCKETS).fill(0);
}

export function addHist(into: number[], from: readonly number[]): void {
  for (let i = 0; i < HIST_BUCKETS; i++) into[i] += from[i] ?? 0;
}

// 칸의 가운데(1.1^(i-0.5))를 값으로 쳐서 칸 너비 10% 의 오차를 ±5% 로 줄인다. 빈 분포는 null
export function percentile(hist: readonly number[], q: number): number | null {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const rank = Math.ceil(total * q);
  let seen = 0;
  for (let i = 0; i < HIST_BUCKETS; i++) {
    seen += hist[i] ?? 0;
    if (seen >= rank) return i === 0 ? 1 : Math.round(1.1 ** (i - 0.5));
  }
  return Math.round(1.1 ** (HIST_BUCKETS - 1.5));
}
