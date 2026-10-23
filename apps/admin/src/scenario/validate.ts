// 시나리오 조립을 가린다 — 부품 모양(zod)과 400 으로 거절할 조립 규칙 (SPEC 도메인/시나리오 §7)
// DB 와 파일을 모른다. 카탈로그 재료는 parts.ts 가 만들어 넘긴다

import type { Platform, ScenarioLink, ScenarioPart, ScenarioResponseRef } from '@platform/kit';
import { 값주입이름 as 값이름 } from '@platform/kit/protocol';
import { z } from 'zod';

import { tcId종류 } from '../catalog/rules.js';

import { 섞였나 } from './mixed.js';

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
    service: z.string().optional(),
    auth: z.string().optional(),
    values: z.array(z.object({ name: z.string(), value: 응답값모양 })).optional(),
    expectJson: z.array(z.object({ jsonPath: z.string().min(1), equals: z.unknown() })).optional(),
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
  | 빠진칸<Extract<ScenarioPart, { kind: 'api' }>, Extract<z.infer<typeof 부품모양>, { kind: 'api' }>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'reuse' }>, 이어주기<'reuse'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'block' }>, 이어주기<'block'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'rewrite' }>, 이어주기<'rewrite'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'rewrite' }>['to'], 이어주기<'rewrite'>['to']>
  | 빠진칸<Extract<ScenarioLink, { kind: 'bind' }>, 이어주기<'bind'>>
  | 빠진칸<ScenarioResponseRef, z.infer<typeof 응답값모양>>,
  never
>;

/** params 는 케이스 입력값 칸 이름이다 — 값 꽂기가 없는 칸을 가리키는지 본다 */
export type 카탈로그 = Map<string, { platforms: Platform[]; isActive: boolean; skippable: string[]; titles: string[]; params: string[] }>;

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

/** 크기 상한 사유. 넘지 않으면 null. 조립검사 · 값 연결 제안은 다른 검사보다 이것을 먼저 본다 — 큰 목록은 부품마다 도는 검사가 서버를 수 초 붙잡는다 */
export function 크기사유(parts: ScenarioPart[]): string | null {
  const 크기 = Buffer.byteLength(JSON.stringify(parts));
  return 크기 > 크기상한 ? `단계 목록이 ${크기}바이트로 ${크기상한}바이트를 넘는다` : null;
}

/** 60분·크기 상한 사유. 저장(조립검사)과 실행 가능 판정이 같은 것을 본다. 비면 통과다 */
export function 제한시간크기사유(parts: ScenarioPart[]): string[] {
  const 사유: string[] = [];
  // 상한은 바닥 전 합으로 본다 — 바닥은 러너 몫이지 조립이 쓴 시간이 아니다
  const 합 = 부품시간합(parts);
  if (합 > 제한시간상한) 사유.push(`제한 시간 합이 ${합}ms 로 ${제한시간상한}ms 를 넘는다`);
  const 크기 = 크기사유(parts);
  if (크기 !== null) 사유.push(크기);
  return 사유;
}

// 짧은 무늬는 걸린 창의 주소로 풀려 어느 애플리케이션을 가리키는지 모호하다 (SPEC 도메인/시나리오 §3.7 결정 13)
const 짧은무늬 = '시작 애플리케이션 밖의 단계가 섞인 시나리오는 / 로 시작하는 URL 패턴을 쓸 수 없다. **/ 로 시작하거나 주소 전체를 적는다';

const 경로규칙 = '/ 로 시작하고 // 로 시작하지 않으며 \\ 와 제어문자가 없어야 한다';

/** API 부품 경로와 바꿔 보내기 고치기 주소가 같은 규칙을 쓴다 (§7) */
function 바른경로(path: string): boolean {
  // `//host` 는 다른 호스트로 풀린다 — 대상 주소 밖으로 못 나가게 한다.
  // URL 해석기는 `\` 를 `/` 로 읽고 탭·줄바꿈을 지워 `/\host` 도 `//host` 가 된다. 러너는 글자로 이어 붙여 안 새지만 두 겹으로 막는다
  return path.startsWith('/') && !path.startsWith('//') && !/[\\\x00-\x1f\x7f]/.test(path);
}

/**
 * 거절 사유를 사람 말로 모은다. 비면 통과다. 되돌리기는 이것을 안 건다 (§7 restore)
 * `허용` 은 섞을 수 있는 애플리케이션 접두사 — 시작 애플리케이션과 같은 프로젝트의 것이다 (결정 13). 안 주면 시작 애플리케이션 하나다
 */
export function 조립검사(parts: ScenarioPart[], platform: Platform, service: string, 재료: 카탈로그, 허용: readonly string[] = [service]): string[] {
  if (parts.length === 0) return ['단계가 하나도 없다'];
  const 너무큼 = 크기사유(parts);
  if (너무큼 !== null) return [너무큼];

  const 오류: string[] = [];
  const 섞임 = 섞였나(parts, service);
  const 켜진모킹 = new Set<string>();
  parts.forEach((p, i) => {
    const 자리 = `${i + 1}번 단계`;
    if (p.kind === 'case') {
      // 접두사부터 본다 — 남의 서비스 케이스가 있는지 없는지가 오류 문장으로 새지 않게
      if (!허용.some((접두사) => p.tcId.startsWith(`${접두사}-`))) {
        오류.push(
          허용.length === 1
            ? `${자리}: ${p.tcId} 는 ${service} 서비스의 케이스가 아니다`
            : `${자리}: ${p.tcId} 는 ${service} 서비스와 같은 프로젝트의 애플리케이션 케이스가 아니다`,
        );
        return;
      }
      // 재료가 UI 를 빼 두므로 먼저 본다 — 아니면 「없거나 비활성」으로 잘못 말한다 (도메인/작성 §3.6 「★ 테스트 두 갈래」)
      if (tcId종류(p.tcId) === 'UI') {
        오류.push(`${자리}: ${p.tcId} 는 UI 테스트라 E2E 단계가 될 수 없다`);
        return;
      }
      const 케이스 = 재료.get(p.tcId);
      if (케이스 === undefined || !케이스.isActive) {
        오류.push(`${자리}: ${p.tcId} 는 없거나 비활성인 케이스다`);
        return;
      }
      if (!케이스.platforms.includes(platform)) 오류.push(`${자리}: ${p.tcId} 는 ${platform} 을 선언하지 않았다`);
      for (const 제목 of p.skipSteps) {
        // 케이스에서 사라진 제목은 실행처럼 무시한다 — 명세 결정 8 · 2026-10-06 사용자
        if (케이스.titles.includes(제목) && !케이스.skippable.includes(제목)) 오류.push(`${자리}: 「${제목}」 은 건너뛸 수 있는 절차가 아니다`);
      }

      // 이어 주기 (§3.7 결정 12)
      const links = p.links ?? [];
      if (p.carryOver === false && (p.skipSteps.length > 0 || links.length > 0)) {
        오류.push(`${자리}: 로그인 이어받기를 끈 단계에는 사전 단계 건너뛰기와 값 연결을 걸 수 없다`);
      }
      const 꽂은칸 = new Set<string>();
      const 겹친칸 = new Set<string>();
      for (const 이음 of links) {
        const 가리킴 =
          이음.kind === 'reuse' ? 이음.fromSeq : 이음.kind === 'rewrite' ? 이음.to.value.fromSeq : 이음.kind === 'bind' ? 이음.value.fromSeq : null;
        // 앞 케이스 부품만 받은 응답이 있다 — api · mock · 뒤 부품을 가리키면 러너가 꺼낼 값이 없다
        if (가리킴 !== null && !(가리킴 <= i && parts[가리킴 - 1]?.kind === 'case')) {
          오류.push(`${자리}: 값 연결이 가리키는 ${가리킴}번 단계는 자기보다 앞의 케이스 단계가 아니다`);
        }
        if (이음.kind === 'rewrite') {
          if (!바른경로(이음.to.path)) 오류.push(`${자리}: 수정 요청 경로는 ${경로규칙}`);
          // 러너 입구와 같은 문장이다 (apps/runner/src/routes.ts scenarioLink)
          if (이음.to.path.split('{}').length !== 2) 오류.push(`${자리}: 수정 요청 경로에 {} 자리가 꼭 하나 있어야 한다`);
        } else if (이음.kind === 'bind') {
          if (!케이스.params.includes(이음.param)) 오류.push(`${자리}: 「${이음.param}」 는 ${p.tcId} 의 입력값 칸이 아니다`);
          else if (꽂은칸.has(이음.param)) 겹친칸.add(이음.param);
          꽂은칸.add(이음.param);
        }
      }
      for (const 칸 of 겹친칸) 오류.push(`${자리}: 「${칸}」 칸에 값 주입이 둘 이상이다`);
    } else if (p.kind === 'api') {
      if (!바른경로(p.path)) 오류.push(`${자리}: API 경로는 ${경로규칙}`);
      if (p.service !== undefined && !허용.includes(p.service)) {
        오류.push(`${자리}: API 호출의 애플리케이션 ${p.service} 는 ${service} 서비스와 같은 프로젝트가 아니다`);
      }
      // API 인증 이름은 설정과 같은 1~20자다. 그 대상 서버에 있는지는 실행 때 러너가 본다 — 이름은 서버마다 따로 넣는다 (결정 14)
      if (p.auth !== undefined && (p.auth.length < 1 || p.auth.length > 20)) 오류.push(`${자리}: API 인증 이름은 1~20자다`);
      const 이름들 = new Set<string>();
      // 값 주입마다 본문을 다시 글자로 바꾸면 「주입 수 × 본문 크기」만큼 돈다
      const 본문글 = JSON.stringify(p.body ?? null);
      for (const v of p.values ?? []) {
        if (!값이름.test(v.name)) 오류.push(`${자리}: 값 주입 이름 「${v.name}」 은 영문 · 숫자 · 한글 · _ 1~20자여야 한다`);
        else if (이름들.has(v.name)) 오류.push(`${자리}: 값 주입 이름 「${v.name}」 이 둘 이상이다`);
        이름들.add(v.name);
        // API 호출 단계는 앞의 API 호출 단계 응답도 꺼낸다 — 러너가 그 응답을 적어 둔다
        const 앞 = parts[v.value.fromSeq - 1];
        if (!(v.value.fromSeq <= i && (앞?.kind === 'case' || 앞?.kind === 'api'))) {
          오류.push(`${자리}: 값 주입이 가리키는 ${v.value.fromSeq}번 단계는 자기보다 앞의 케이스 · API 호출 단계가 아니다`);
        } else if (앞.kind === 'api' && 앞.method !== v.value.method) {
          // 러너는 메서드로 응답을 고른다 — 다르면 저장은 되고 실행 때 「맞는 응답이 없다」로 멈춘다
          오류.push(`${자리}: 값 주입이 가리키는 ${v.value.fromSeq}번 단계는 ${앞.method} 요청이다`);
        }
        // 이름을 잘못 적으면 {…} 가 그대로 나가 엉뚱한 응답 코드로만 드러난다
        if (값이름.test(v.name) && !p.path.includes(`{${v.name}}`) && !본문글.includes(`{${v.name}}`)) {
          오류.push(`${자리}: 값 주입 이름 「${v.name}」 자리 {${v.name}} 가 경로 · 본문에 없다`);
        }
      }
    } else if (p.kind === 'mock') {
      켜진모킹.add(p.urlPattern);
      if (섞임 && p.urlPattern.startsWith('/')) 오류.push(`${자리}: ${짧은무늬}`);
    } else if (p.kind === 'unmock') {
      if (섞임 && p.urlPattern.startsWith('/')) 오류.push(`${자리}: ${짧은무늬}`);
      if (!켜진모킹.delete(p.urlPattern)) 오류.push(`${자리}: 켜져 있는 「${p.urlPattern}」 모킹이 없다`);
    } else if (p.ms <= 0 || p.ms > 대기상한) {
      오류.push(`${자리}: 대기는 1ms 부터 ${대기상한}ms 까지다`);
    }
  });

  return [...오류, ...제한시간크기사유(parts)];
}
