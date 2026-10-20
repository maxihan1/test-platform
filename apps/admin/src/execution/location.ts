// POST /api/runs 요청 본문 스키마와 Android 앱 실행을 받을지 판정 (SPEC 실행 §7)

import { z } from 'zod';

import { 팜주소 } from './farm.js';

// 기본값이 곧 상한이다 — 더 길게 주면 디바이스 잠금을 그만큼 쥔다(2026-10-07 게이트 0). 줄이는 데만 쓴다
export const DEFAULT_TIMEOUT_MS = 300_000;

// routes.ts 가 300줄을 넘지 않게 여기로 뺐다
export const runBody = z.object({
  // title 은 받지 않는다 — 서버가 짓는다. 옛 화면이 실어 보내면 zod 가 버린다(400 이 아니다 — 배포 틈에 실행이 막히지 않게, SPEC 실행 §7)
  // 「실패 N건 다시 실행」이 싣는 원래 실행 번호
  rerunOf: z.number().int().positive().optional(),
  // 실행자는 여기 없다. 로그인한 사람에게서 온다 — 보내는 쪽이 정할 수 있으면 아무 이름이나
  // 적을 수 있어 증적이 증적이 아니게 된다 (SPEC §3.5). 본문에 실려 와도 zod가 버린다
  // 대상 서버 키. 기본값을 두지 않는다 — 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §6).
  // 주소는 요청이 싣지 않는다. 서버가 그 서비스의 service_env에서 찾는다
  env: z.string().min(1),
  // 요청 최상위에 하나다. 항목마다 다르면 실행 항목 수를 미리 셀 수 없다 (SPEC §8.2)
  repeat: z.number().int().positive().default(1),
  // 기본은 꺼짐. 자기 확인용까지 팀 채널에 흘리면 채널이 소음이 된다 (SPEC §8.2 · §8.9)
  notifySlack: z.boolean().default(false),
  // 실행 위치(location)는 받지 않는다 — android 정식 실행은 늘 디바이스 팜이다(2026-10-20 APP-F1-10). 옛 화면이 실어 보내면 zod 가 버린다
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
export type 거절 = { status: 409; error: 'FARM_OFF'; detail: string };

// 실행을 만들기 전에 부른다 — 거절되면 test_run 이 생기지 않는다
export function 팜을본다(items: { platforms: string[] }[], env: Record<string, string | undefined>): 거절 | null {
  if (!items.some((i) => i.platforms.includes('android'))) return null;
  // 운영자가 고칠 자리(환경값 이름)만 싣는다
  if (팜주소(env) === undefined) return { status: 409, error: 'FARM_OFF', detail: 'DEVICE_FARM_URL 이 비어 있다' };
  return null;
}

// 앱 케이스를 desktop 으로 보내 실행 위치 검사 · 디바이스 줄을 건너뛰지 못하게 한다(2026-10-07 APP-F1-07).
// CASE_NOT_FOUND 다음에 부르므로 표에 없는 tcId 는 보지 않는다
export function 선언밖디바이스<P extends string>(
  items: readonly { tcId: string; platforms: readonly P[] }[],
  선언: ReadonlyMap<string, { platforms: readonly string[] }>,
): { tcId: string; platform: P } | null {
  for (const item of items) {
    const 케이스 = 선언.get(item.tcId);
    if (!케이스) continue;
    const platform = item.platforms.find((p) => !케이스.platforms.includes(p));
    if (platform !== undefined) return { tcId: item.tcId, platform };
  }
  return null;
}

// 팜이 없는 서버의 정기 실행은 앱 케이스를 뺀다 — 넣으면 매일 NA 만 쌓인다 (SPEC 공통/6-인프라 §9.2)
export function 앱케이스를뺀다<T extends { platforms: readonly string[] }>(items: T[], env: Record<string, string | undefined>): { 남은: T[]; 뺀수: number } {
  if (팜주소(env) !== undefined) return { 남은: items, 뺀수: 0 };
  const 남은 = items.filter((c) => !c.platforms.includes('android'));
  return { 남은, 뺀수: items.length - 남은.length };
}
