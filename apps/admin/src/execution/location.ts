// POST /api/runs 요청 본문 스키마와 Android 앱 실행을 받을지 판정 (SPEC 실행 §7)

import { PC_PLATFORMS, PC항목인가, type Platform } from '@platform/kit';
import { z } from 'zod';

import { 게임시나리오인가 } from '../catalog/rules.js';
import { 팜주소 } from './farm.js';

// 기본값이 곧 상한이다 — 더 길게 주면 디바이스 잠금을 그만큼 쥔다(2026-10-07 게이트 0). 줄이는 데만 쓴다
export const DEFAULT_TIMEOUT_MS = 300_000;

/** 항목에 실을 제한 시간. 게임 시나리오는 0(한도 없음)이고 사람이 준 값도 안 쓴다 (공통/3-공유계약 「게임 시나리오 도구」) */
export const 항목제한ms = (tcId: string, 준값?: number): number => (게임시나리오인가(tcId) ? 0 : (준값 ?? DEFAULT_TIMEOUT_MS));

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
  // 모바일 웹 실행 위치 — 서버 흉내 · Device VISION 실제 폰 Chrome. 기본은 흉내다 — 폰이 적다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
  mobileOn: z.enum(['server', 'vision']).default('server'),
  items: z
    .array(
      z.object({
        tcId: z.string().min(1),
        // windows 는 선언대로 펼치고 윈도우 값 하나하나는 선언에 있어야 받는다 — PC 게임만 (도메인/게임 §3.10 「윈도우 PC」)
        platforms: z.array(z.enum(['desktop', 'mobile', 'android', ...PC_PLATFORMS])).min(1),
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

// 실행을 만들기 전에 부른다 — 거절되면 test_run 이 생기지 않는다. 모바일은 실제 폰을 골랐을 때만 팜을 쓴다
export function 팜을본다(
  items: { platforms: string[] }[],
  env: Record<string, string | undefined>,
  mobileOn: 'server' | 'vision' = 'server',
): 거절 | null {
  // 윈도우 PC 도 VISION 기기다 (도메인/게임 §3.10 「윈도우 PC」)
  const 폰디바이스 = mobileOn === 'vision' ? ['android', 'mobile'] : ['android'];
  if (!items.some((i) => i.platforms.some((p) => 폰디바이스.includes(p) || PC항목인가(p)))) return null;
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
    // windows 는 「선언한 윈도우 값으로 펼쳐 달라」라 패드 값만 선언한 버튼 그림 케이스에도 건다. 윈도우 값 하나하나는 선언에 그대로 있어야 한다 (도메인/게임 §7)
    const platform = item.platforms.find((p) => (p === 'windows' ? !케이스.platforms.some(PC항목인가) : !케이스.platforms.includes(p)));
    if (platform !== undefined) return { tcId: item.tcId, platform };
  }
  return null;
}

/** 애플리케이션이 돌릴 수 없는 디바이스 값 — 게임 밖 · 모바일 게임의 윈도우 값, PC 게임의 android. 게임 하나에 플랫폼 하나다 (도메인/게임 §3.10 결정 27) */
export function 플랫폼밖인가(kind: string, gamePlatform: 'android' | 'windows' | null, p: string): boolean {
  return kind === 'GAME' && gamePlatform === 'windows' ? p === 'android' : PC항목인가(p);
}

/**
 * PC 게임 케이스의 windows 를 선언대로 펼친다 — 선언의 windows 는 한 번, 패드 값은 지원 패드에 남은 것마다.
 * 값 하나하나(windows-ps5)로 건 항목은 그대로다 — 사람이 고른 값이라 지원 패드를 안 본다(실패 다시 실행). 펼친 값이 하나도 없는 케이스는 빠진다 (도메인/게임 §3.10 「윈도우 PC」)
 * @param 다시 실패 다시 실행 — windows 도 원래 항목의 값(키보드)이라 펼치지 않는다. 펼치면 키보드만 실패했는데 통과한 패드 항목까지 다시 돈다
 */
export function 윈도우를펼친다<T extends { tcId: string; platforms: Platform[] }>(
  items: readonly T[],
  선언: ReadonlyMap<string, { platforms: readonly string[] }>,
  지원패드: readonly string[],
  다시 = false,
): T[] {
  return items.flatMap((item) => {
    if (다시 || !item.platforms.includes('windows')) return [item];
    const 선언값 = (선언.get(item.tcId)?.platforms ?? []).filter(PC항목인가);
    const 펼친 = 선언값.filter((p) => p === 'windows' || 지원패드.includes(p.slice('windows-'.length)));
    const platforms = [...new Set(item.platforms.flatMap((p): Platform[] => (p === 'windows' ? 펼친 : [p])))];
    return platforms.length === 0 ? [] : [{ ...item, platforms }];
  });
}

// 팜이 없는 서버의 정기 실행은 앱 케이스 · 윈도우 PC 게임 케이스를 뺀다 — 넣으면 매일 NA 만 쌓인다 (SPEC 공통/6-인프라 §9.2)
export function 앱케이스를뺀다<T extends { platforms: readonly string[] }>(items: T[], env: Record<string, string | undefined>): { 남은: T[]; 뺀수: number } {
  if (팜주소(env) !== undefined) return { 남은: items, 뺀수: 0 };
  const 남은 = items.filter((c) => !c.platforms.some((p) => p === 'android' || PC항목인가(p)));
  return { 남은, 뺀수: items.length - 남은.length };
}
