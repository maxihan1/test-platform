// 응답시간 분포 칸 — QA Hub 가 에이전트 여러 대의 분포를 칸끼리 더해 95% 를 다시 세므로 경계가 양쪽에서 같아야 한다 (도메인/성능 §3.9 「분포」)

export const HIST_BUCKETS = 116;

const STEP = Math.log(1.1);

// 칸 0 은 1ms 이하, 칸 i 는 1.1^(i-1)ms 초과 1.1^i ms 이하. 마지막 칸(1.1^115 ≈ 57.6초)을 넘는 응답도 마지막 칸에 센다
export function bucketOf(ms: number): number {
  if (!(ms > 1)) return 0;
  // 경계값 자체(1.1^i)가 부동소수 오차로 다음 칸에 넘어가지 않게 조금 깎는다
  return Math.min(HIST_BUCKETS - 1, Math.ceil(Math.log(ms) / STEP - 1e-9));
}

export function emptyHist(): number[] {
  return new Array<number>(HIST_BUCKETS).fill(0);
}
