// 러너 GET /progress 묻기 — 정식 실행 진행 창 · 케이스 시험 · E2E 시험이 같이 쓴다 (도메인/러너 §5.2 · 도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)

import type { RunningScenario, RunningStep } from '@platform/kit';

import { runnerUrl, 러너들, 러너머리 } from './runnerAddr.js';

// 지금 러너에서 돌고 있는 절차들. 닿지 못하거나 200 이 아니면 빈 목록이다 —
// 한 번 실패가 곧 「러너가 죽었다」는 아니고, 러너 고장을 사람에게 알리는 자리는 따로 있다 (SPEC §8.3).
// **여기서 거르지 않는다.** 러너의 목록은 모든 서비스의 자식을 담고 runId 칸이 없다 (SPEC §5.2)
export async function 진행(주소들 = 러너들(), 제한ms = 3_000): Promise<RunningStep[]> {
  return (await 러너진행(주소들, 제한ms)).items;
}

/** 러너 /progress 한 번의 두 갈래 — 케이스 자식의 단계와 E2E 시나리오 자식의 지금 부품. 한 번 물어 둘 다 쓴다 (2026-11-06 WEB-F9-14) */
export interface 러너진행답 {
  items: RunningStep[];
  scenarios: RunningScenario[];
}

export async function 러너진행(주소들 = 러너들(), 제한ms = 3_000): Promise<러너진행답> {
  // 러너마다 따로 묻는다. 한쪽이 죽어도 다른 쪽 절차는 보여야 한다
  const 목록 = await Promise.all(
    주소들.map(async (주소): Promise<러너진행답> => {
      try {
        // 화면이 짧은 주기로 다시 묻는다. 오래 매달려 있어 봐야 다음 물음이 덮는다
        const res = await fetch(`${주소}/progress`, { headers: 러너머리(), signal: AbortSignal.timeout(제한ms) });
        if (!res.ok) return { items: [], scenarios: [] };
        const 답 = (await res.json()) as Partial<러너진행답>;
        return { items: 답.items ?? [], scenarios: 답.scenarios ?? [] };
      } catch {
        return { items: [], scenarios: [] };
      }
    }),
  );
  return { items: 목록.flatMap((답) => 답.items), scenarios: 목록.flatMap((답) => 답.scenarios) };
}

// 받은 때가 undefined 면 아직 답을 기다리는 중이다 — 그동안 온 물음도 같은 답을 기다린다
let 앞시험진행: { 받은때: number | undefined; 값: Promise<러너진행답> } | undefined;

/**
 * 시험 실행이 도는 서버 러너의 절차들 — 답을 받은 뒤 1초 동안, 그리고 기다리는 동안 모든 시험이 한 답을 함께 쓴다.
 * 화면이 1.5초마다 묻고 시험이 여럿이면 그만큼 러너를 부르게 돼서다.
 * 3초까지 기다린다 — 1초였을 때 CPU 둘인 서버에서 WebKit(모바일)이 돌면 답이 매번 늦어 단계가 끝까지 비었다
 * (2026-11-06 WEB-F9-14 · 점검표 B1 · 도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)
 */
export function 시험진행(): Promise<RunningStep[]> {
  return 시험러너진행().then((답) => 답.items);
}

/** E2E 시험 실행의 지금 부품 — 케이스 시험과 같은 한 답을 함께 쓴다 (도메인/시나리오 §7 `GET /api/scenario-trials/:trialId`) */
export function 시험시나리오진행(): Promise<RunningScenario[]> {
  return 시험러너진행().then((답) => 답.scenarios);
}

function 시험러너진행(): Promise<러너진행답> {
  const 앞 = 앞시험진행;
  if (앞 !== undefined && (앞.받은때 === undefined || Date.now() - 앞.받은때 < 1_000)) return 앞.값;
  const 이번: NonNullable<typeof 앞시험진행> = { 받은때: undefined, 값: 러너진행([runnerUrl()], 3_000) };
  void 이번.값.then(() => {
    이번.받은때 = Date.now();
  });
  앞시험진행 = 이번;
  return 이번.값;
}
