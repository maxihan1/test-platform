// POST /api/runs 요청 본문 스키마와 Android 실행 위치 판정 (SPEC 실행 §7)

import { z } from 'zod';

// 기본값이 곧 상한이다 — 더 길게 주면 디바이스 잠금을 그만큼 쥔다(2026-10-07 게이트 0). 줄이는 데만 쓴다
export const DEFAULT_TIMEOUT_MS = 300_000;

// routes.ts 가 300줄을 넘지 않게 여기로 뺐다
export const runBody = z.object({
  title: z.string().min(1),
  // 실행자는 여기 없다. 로그인한 사람에게서 온다 — 보내는 쪽이 정할 수 있으면 아무 이름이나
  // 적을 수 있어 증적이 증적이 아니게 된다 (SPEC §3.5). 본문에 실려 와도 zod가 버린다
  // 대상 서버 키. 기본값을 두지 않는다 — 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §6).
  // 주소는 요청이 싣지 않는다. 서버가 그 서비스의 service_env에서 찾는다
  env: z.string().min(1),
  // 요청 최상위에 하나다. 항목마다 다르면 실행 항목 수를 미리 셀 수 없다 (SPEC §8.2)
  repeat: z.number().int().positive().default(1),
  // 기본은 꺼짐. 자기 확인용까지 팀 채널에 흘리면 채널이 소음이 된다 (SPEC §8.2 · §8.9)
  notifySlack: z.boolean().default(false),
  // 스키마에 없는 칸은 zod 가 조용히 버리므로 반드시 적는다. 필수 여부는 스키마가 아니라
  // 실행위치를본다가 판정한다 — 브라우저 항목만 있으면 이 칸을 안 본다
  location: z.enum(['local', 'farm']).optional(),
  items: z
    .array(
      z.object({
        tcId: z.string().min(1),
        platforms: z.array(z.enum(['desktop', 'mobile', 'android'])).min(1),
        params: z.record(z.string(), z.unknown()).default({}),
        expected: z.record(z.string(), z.unknown()).default({}),
        // SPEC §10의 DEMO-007은 5초로 줘야 러너의 타임아웃 처리를 확인할 수 있다
        timeoutMs: z.number().int().positive().max(DEFAULT_TIMEOUT_MS).optional(),
      }),
    )
    .min(1),
});

// 화면은 코드마다 자기 문장을 쓰고 detail 을 그 뒤에 붙인다(errorText.ts). 그래서 detail 에는 화면 문장이 말하지 않는 것만 싣는다 —
// 같은 말을 실으면 화면에 두 번 뜬다(2026-10-07 실기기 확인)
export type 거절 = { status: 400 | 409; error: 'INVALID_REQUEST' | 'FARM_OFF' | 'LOCAL_OFF'; detail?: string };

// 실행을 만들기 전에 부른다 — 거절되면 test_run 이 생기지 않는다. 위치는 DB 에 남기지 않는다
export function 실행위치를본다(
  items: { platforms: string[] }[],
  location: 'local' | 'farm' | undefined,
  env: Record<string, string | undefined>,
): 거절 | null {
  if (!items.some((i) => i.platforms.includes('android'))) return null;
  if (location === undefined) {
    return { status: 400, error: 'INVALID_REQUEST', detail: 'Android 앱 케이스를 돌리려면 실행 위치(location)를 골라야 한다' };
  }
  if (location === 'farm') {
    return { status: 409, error: 'FARM_OFF' };
  }
  if (!env.LOCAL_RUNNER_URL) {
    // 운영자가 고칠 자리(환경값 이름)만 싣는다
    return { status: 409, error: 'LOCAL_OFF', detail: 'LOCAL_RUNNER_URL 이 비어 있다' };
  }
  return null;
}

// 정기 실행은 실행 위치를 고를 사람이 없고, admin 과 다른 프로세스라 디바이스 잠금을 같이 못 본다 —
// 그래서 앱 케이스는 팜이 붙기 전까지 뺀다
export function 앱케이스를뺀다<T extends { platforms: readonly string[] }>(items: T[]): { 남은: T[]; 뺀수: number } {
  const 남은 = items.filter((c) => !c.platforms.includes('android'));
  return { 남은, 뺀수: items.length - 남은.length };
}
