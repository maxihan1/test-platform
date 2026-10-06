// 시나리오 조립을 가린다 — 부품 모양(zod)과 400 으로 거절할 조립 규칙 (SPEC 도메인/시나리오 §7)
// DB 와 파일을 모른다. 카탈로그 재료는 parts.ts 가 만들어 넘긴다

import type { Platform, ScenarioLink, ScenarioPart, ScenarioResponseRef } from '@platform/kit';
import { z } from 'zod';

import { tcId종류 } from '../catalog/rules.js';

// 러너 입구(apps/runner/src/routes.ts scenarioLink · responseRef)와 맞춘다 — 여기서 통과한 것을 러너가 400 으로 돌려보내면 저장만 되고 영영 못 돈다.
// 바꿔 보내기 경로 규칙과 {} 개수는 사람 말 사유로 알려 주려고 조립검사가 본다
const 메서드 = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const 부품번호 = z.number().int().positive();
const 응답값모양 = z.object({ fromSeq: 부품번호, method: 메서드, urlPattern: z.string().min(1), jsonPath: z.string().min(1) });
const 이어주기모양 = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reuse'), method: 메서드, urlPattern: z.string().min(1), fromSeq: 부품번호 }),
  z.object({ kind: z.literal('block'), method: 메서드, urlPattern: z.string().min(1) }),
  z.object({
    kind: z.literal('rewrite'),
    method: 메서드,
    urlPattern: z.string().min(1),
    to: z.object({ method: z.enum(['PUT', 'PATCH']), path: z.string(), value: 응답값모양 }),
  }),
  z.object({ kind: z.literal('bind'), param: z.string().min(1), value: 응답값모양 }),
]);

// 부품 표의 정본은 도메인/시나리오 §3.7 · 코드 값은 공유계약 §5.1 ScenarioPart 다
const 부품모양 = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('case'),
    tcId: z.string(),
    params: z.record(z.string(), z.unknown()),
    expected: z.record(z.string(), z.unknown()),
    skipSteps: z.array(z.string()),
    carryOver: z.boolean().optional(),
    links: z.array(이어주기모양).optional(),
  }),
  z.object({
    kind: z.literal('api'),
    method: 메서드,
    path: z.string(),
    body: z.unknown().optional(),
    expectStatus: z.number().int(),
  }),
  z.object({
    kind: z.literal('mock'),
    urlPattern: z.string().min(1), // 러너와 같게 — 빈 무늬는 러너가 400 이라 저장만 되고 영영 못 돈다
    status: z.number().int().min(100).max(599),
    contentType: z.string(),
    body: z.string(),
  }),
  z.object({ kind: z.literal('unmock'), urlPattern: z.string().min(1) }),
  z.object({ kind: z.literal('wait'), ms: z.number().int() }),
]);

export const 부품들모양: z.ZodType<ScenarioPart[]> = z.array(부품모양);

// z.object 는 모르는 칸을 오류 없이 버리고 위 ZodType 주석은 빠진 선택 칸을 못 잡는다(carryOver · links 가 그렇게 사라졌다).
// kit 에 칸이 더해졌는데 여기 안 적으면 그 칸 이름이 typecheck 오류로 뜬다
type 빠진칸<K, Z> = Exclude<keyof K, keyof Z>;
type 이어주기<K> = Extract<z.infer<typeof 이어주기모양>, { kind: K }>;
({}) satisfies Record<
  | 빠진칸<Extract<ScenarioPart, { kind: 'case' }>, Extract<z.infer<typeof 부품모양>, { kind: 'case' }>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'reuse' }>, 이어주기<'reuse'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'block' }>, 이어주기<'block'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'rewrite' }>, 이어주기<'rewrite'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'rewrite' }>['to'], 이어주기<'rewrite'>['to']>
  | 빠진칸<Extract<ScenarioLink, { kind: 'bind' }>, 이어주기<'bind'>>
  | 빠진칸<ScenarioResponseRef, z.infer<typeof 응답값모양>>,
  never
>;

/** params 는 케이스 입력값 칸 이름이다 — 값 꽂기가 없는 칸을 가리키는지 본다 */
export type 카탈로그 = Map<string, { platforms: Platform[]; isActive: boolean; skippable: string[]; params: string[] }>;

const 케이스몫 = 300000;
const API몫 = 30000;
const 대기상한 = 60000;
const 바닥 = 60000;
const 제한시간상한 = 3600000;
const 크기상한 = 100000;

function 부품시간합(parts: ScenarioPart[]): number {
  return parts.reduce(
    (합, p) => 합 + (p.kind === 'case' ? 케이스몫 : p.kind === 'api' ? API몫 : p.kind === 'wait' ? p.ms : 0),
    0,
  );
}

/** 러너에 넘길 제한 시간. ③ 이 `timeoutMs` 로 쓴다 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」) */
export function 시나리오제한시간(parts: ScenarioPart[]): number {
  return Math.max(부품시간합(parts), 바닥);
}

/** 60분·크기 상한 사유. 저장(조립검사)과 실행 가능 판정이 같은 것을 본다. 비면 통과다 */
export function 제한시간크기사유(parts: ScenarioPart[]): string[] {
  const 사유: string[] = [];
  // 상한은 바닥 전 합으로 본다 — 바닥은 러너 몫이지 조립이 쓴 시간이 아니다
  const 합 = 부품시간합(parts);
  if (합 > 제한시간상한) 사유.push(`제한 시간 합이 ${합}ms 로 ${제한시간상한}ms 를 넘는다`);
  const 크기 = Buffer.byteLength(JSON.stringify(parts));
  if (크기 > 크기상한) 사유.push(`부품 목록이 ${크기}바이트로 ${크기상한}바이트를 넘는다`);
  return 사유;
}

const 경로규칙 = '/ 로 시작하고 // 로 시작하지 않으며 \\ 와 제어문자가 없어야 한다';

/** API 부품 경로와 바꿔 보내기 고치기 주소가 같은 규칙을 쓴다 (§7) */
function 바른경로(path: string): boolean {
  // `//host` 는 다른 호스트로 풀린다 — 대상 주소 밖으로 못 나가게 한다.
  // URL 해석기는 `\` 를 `/` 로 읽고 탭·줄바꿈을 지워 `/\host` 도 `//host` 가 된다. 러너는 글자로 이어 붙여 안 새지만 두 겹으로 막는다
  return path.startsWith('/') && !path.startsWith('//') && !/[\\\x00-\x1f\x7f]/.test(path);
}

/** 거절 사유를 사람 말로 모은다. 비면 통과다. 되돌리기는 이것을 안 건다 (§7 restore) */
export function 조립검사(parts: ScenarioPart[], platform: Platform, service: string, 재료: 카탈로그): string[] {
  if (parts.length === 0) return ['부품이 하나도 없다'];

  const 오류: string[] = [];
  const 켜진모킹 = new Set<string>();
  parts.forEach((p, i) => {
    const 자리 = `${i + 1}번 부품`;
    if (p.kind === 'case') {
      // 접두사부터 본다 — 남의 서비스 케이스가 있는지 없는지가 오류 문장으로 새지 않게
      if (!p.tcId.startsWith(`${service}-`)) {
        오류.push(`${자리}: ${p.tcId} 는 ${service} 서비스의 케이스가 아니다`);
        return;
      }
      // 재료가 UI 를 빼 두므로 먼저 본다 — 아니면 「없거나 비활성」으로 잘못 말한다 (도메인/작성 §3.6 「★ 테스트 두 갈래」)
      if (tcId종류(p.tcId) === 'UI') {
        오류.push(`${자리}: ${p.tcId} 는 UI 테스트라 E2E 부품이 될 수 없다`);
        return;
      }
      const 케이스 = 재료.get(p.tcId);
      if (케이스 === undefined || !케이스.isActive) {
        오류.push(`${자리}: ${p.tcId} 는 없거나 비활성인 케이스다`);
        return;
      }
      if (!케이스.platforms.includes(platform)) 오류.push(`${자리}: ${p.tcId} 는 ${platform} 을 선언하지 않았다`);
      for (const 제목 of p.skipSteps) {
        if (!케이스.skippable.includes(제목)) 오류.push(`${자리}: 「${제목}」 은 건너뛸 수 있는 절차가 아니다`);
      }

      // 이어 주기 (§3.7 결정 12)
      const links = p.links ?? [];
      if (p.carryOver === false && (p.skipSteps.length > 0 || links.length > 0)) {
        오류.push(`${자리}: 넘겨받기를 끈 부품에는 건너뛰기와 이어 주기를 걸 수 없다`);
      }
      const 꽂은칸 = new Set<string>();
      const 겹친칸 = new Set<string>();
      for (const 이음 of links) {
        const 가리킴 =
          이음.kind === 'reuse' ? 이음.fromSeq : 이음.kind === 'rewrite' ? 이음.to.value.fromSeq : 이음.kind === 'bind' ? 이음.value.fromSeq : null;
        // 앞 케이스 부품만 받은 응답이 있다 — api · mock · 뒤 부품을 가리키면 러너가 꺼낼 값이 없다
        if (가리킴 !== null && !(가리킴 <= i && parts[가리킴 - 1]?.kind === 'case')) {
          오류.push(`${자리}: 이어 주기가 가리키는 ${가리킴}번 부품은 자기보다 앞의 케이스 부품이 아니다`);
        }
        if (이음.kind === 'rewrite') {
          if (!바른경로(이음.to.path)) 오류.push(`${자리}: 바꿔 보내기 경로는 ${경로규칙}`);
          // 러너 입구와 같은 문장이다 (apps/runner/src/routes.ts scenarioLink)
          if (이음.to.path.split('{}').length !== 2) 오류.push(`${자리}: 바꿔 보내기 경로에 {} 자리가 꼭 하나 있어야 한다`);
        } else if (이음.kind === 'bind') {
          if (!케이스.params.includes(이음.param)) 오류.push(`${자리}: 「${이음.param}」 는 ${p.tcId} 의 입력값 칸이 아니다`);
          else if (꽂은칸.has(이음.param)) 겹친칸.add(이음.param);
          꽂은칸.add(이음.param);
        }
      }
      for (const 칸 of 겹친칸) 오류.push(`${자리}: 「${칸}」 칸에 값 꽂기가 둘 이상이다`);
    } else if (p.kind === 'api') {
      if (!바른경로(p.path)) 오류.push(`${자리}: API 경로는 ${경로규칙}`);
    } else if (p.kind === 'mock') {
      켜진모킹.add(p.urlPattern);
    } else if (p.kind === 'unmock') {
      if (!켜진모킹.delete(p.urlPattern)) 오류.push(`${자리}: 켜져 있는 「${p.urlPattern}」 모킹이 없다`);
    } else if (p.ms <= 0 || p.ms > 대기상한) {
      오류.push(`${자리}: 대기는 1ms 부터 ${대기상한}ms 까지다`);
    }
  });

  return [...오류, ...제한시간크기사유(parts)];
}
