// 정기 실행 세트의 줄 판정 — 돌 때 빠지는 줄 · 저장 거절 · 기준 세트 꼴. DB 를 안 읽는다 (도메인/정기실행 §3.16 「세트」 · 「안정화 기준 세트」)

import type { ScenarioPart } from '@platform/kit';

import { tcId종류 } from '../catalog/rules.js';
import { 쓰는접두사 } from '../scenario/mixed.js';

export type 줄종류 = 'FN' | 'UI' | 'E2E' | 'COMPAT';
export interface 줄 {
  kind: 줄종류;
  /** FN · UI 는 고른 애플리케이션. E2E · 호환성은 저장할 때의 시작 애플리케이션 · 세트 애플리케이션이다 — 돌 때는 재료에서 다시 읽는다 */
  serviceId: number;
  tcIds: string[] | null;
  scenarioId: number | null;
  compatSetId: number | null;
}

export interface 앱 {
  id: number;
  prefix: string;
  name: string;
  kind: 'SCREEN' | 'APP' | 'GAME' | 'API';
  isActive: boolean;
  projectId: number;
}

export interface 재료 {
  projectId: number;
  앱들: Map<number, 앱>;
  /** 서비스 번호 → 대상 서버 이름 → 실서비스인가 */
  서버들: Map<number, Map<string, boolean>>;
  시나리오: Map<number, { serviceId: number; isActive: boolean; name: string; parts: ScenarioPart[]; runnable: boolean }>;
  호환성: Map<number, { serviceId: number; isActive: boolean; name: string }>;
  /** 줄들이 고른 케이스 번호 가운데 지금 활성인 것 */
  살아있는케이스: Set<string>;
}

/** 서비스 번호 → 고른 대상 서버 이름 */
export type 서버고름 = Map<number, string>;

export type 빠진까닭 =
  | 'SCENARIO_ARCHIVED'
  | 'COMPAT_SET_ARCHIVED'
  | 'SERVICE_MOVED'
  | 'SERVICE_INACTIVE'
  | 'CASES_GONE'
  | 'SCENARIO_NOT_RUNNABLE'
  | 'ENV_GONE'
  | 'ENV_PROD'
  | 'PATH_ENV_GONE'
  | 'PATH_ENV_PROD';

/** 실행을 만드는 애플리케이션 — E2E 는 시나리오의 지금 시작 애플리케이션, 호환성은 세트의 애플리케이션이다 (§3.16 「세트」) */
export function 줄앱(x: 줄, 재: 재료): 앱 | undefined {
  const id = x.kind === 'E2E' ? 재.시나리오.get(x.scenarioId!)?.serviceId : x.kind === 'COMPAT' ? 재.호환성.get(x.compatSetId!)?.serviceId : x.serviceId;
  return id === undefined ? undefined : 재.앱들.get(id);
}

const 앱찾기 = (재: 재료, prefix: string) => [...재.앱들.values()].find((a) => a.prefix === prefix);

/** 섞인 E2E 가 지나가는 다른 애플리케이션은 시작 애플리케이션 서버와 같은 이름의 줄로 간다 (시나리오 §3.7 「대상 서버는 이름으로 짝짓는다」) */
function 지나가는서버까닭(x: 줄, 시작: 앱, env: string, 재: 재료): 빠진까닭 | null {
  for (const p of 쓰는접두사(재.시나리오.get(x.scenarioId!)!.parts, 시작.prefix)) {
    if (p === 시작.prefix) continue;
    const a = 앱찾기(재, p);
    if (a === undefined || a.projectId !== 재.projectId) return 'SCENARIO_NOT_RUNNABLE';
    const 실서비스 = 재.서버들.get(a.id)?.get(env);
    if (실서비스 === undefined) return 'PATH_ENV_GONE';
    if (실서비스) return 'PATH_ENV_PROD';
  }
  return null;
}

/** 지금 돌면 이 줄이 통째로 빠지는 까닭. 빠지지 않으면 null (§3.16 「돌 때 빠지는 줄」) */
export function 빠진까닭(x: 줄, 고름: 서버고름, 재: 재료): 빠진까닭 | null {
  if (x.kind === 'E2E' && 재.시나리오.get(x.scenarioId!)?.isActive !== true) return 'SCENARIO_ARCHIVED';
  if (x.kind === 'COMPAT' && 재.호환성.get(x.compatSetId!)?.isActive !== true) return 'COMPAT_SET_ARCHIVED';
  const a = 줄앱(x, 재);
  if (a === undefined || a.projectId !== 재.projectId) return 'SERVICE_MOVED';
  if (!a.isActive) return 'SERVICE_INACTIVE';
  if (x.tcIds !== null && !x.tcIds.some((t) => 재.살아있는케이스.has(t))) return 'CASES_GONE';
  if (x.kind === 'E2E' && !재.시나리오.get(x.scenarioId!)!.runnable) return 'SCENARIO_NOT_RUNNABLE';
  const env = 고름.get(a.id);
  const 실서비스 = env === undefined ? undefined : 재.서버들.get(a.id)?.get(env);
  if (실서비스 === undefined) return 'ENV_GONE';
  if (실서비스) return 'ENV_PROD';
  return x.kind === 'E2E' ? 지나가는서버까닭(x, a, env!, 재) : null;
}

/** 세트 카드의 「빠진 케이스 N건」 · 「빠진 테스트 N개」. 통째로 빠진 줄은 테스트로 세고, 고른 케이스 일부만 빠지면 케이스로 센다 */
export function 빠진셈(줄들: readonly 줄[], 고름: 서버고름, 재: 재료) {
  const skipped: { seq: number; reason: 빠진까닭 }[] = [];
  let cases = 0;
  줄들.forEach((x, i) => {
    const reason = 빠진까닭(x, 고름, 재);
    if (reason !== null) skipped.push({ seq: i + 1, reason });
    if (x.tcIds !== null && (reason === null || reason === 'CASES_GONE')) cases += x.tcIds.filter((t) => !재.살아있는케이스.has(t)).length;
  });
  return { skipped, missing: { cases, tests: skipped.filter((s) => s.reason !== 'CASES_GONE').length } };
}

/** 같은 줄인가 — 고칠 때 이미 있던 줄은 빠질 까닭이 있어도 거절하지 않는다 (§3.16 「고칠 때」) */
const 같은줄 = (a: 줄, b: 줄) =>
  a.kind === b.kind && (a.kind === 'E2E' ? a.scenarioId === b.scenarioId : a.kind === 'COMPAT' ? a.compatSetId === b.compatSetId : a.serviceId === b.serviceId);

const 줄글 = (seq: number, 말: string) => `items.${seq}: ${말}`;

/**
 * 저장을 거절할 까닭. 없으면 null (§7 「400 detail」). 옛 세트가 있으면 이미 있던 줄 · 대상 서버는 지금 빠질 까닭이 있어도 받는다.
 * 비활성 애플리케이션 · 실행 불가 시나리오는 거절하지 않는다 — 명세의 400 목록에 없고 돌 때 빠진 줄로 보인다
 */
export function 저장문제(새줄: readonly 줄[], 새고름: 서버고름, 옛: { 줄들: readonly 줄[]; 고름: 서버고름 } | null, 재: 재료): string | null {
  const 쓰는앱 = new Map<number, 앱>();
  for (const [i, x] of 새줄.entries()) {
    const seq = i + 1;
    const 옛줄 = 옛?.줄들.find((o) => 같은줄(o, x));
    const a = 줄앱(x, 재);
    if (옛줄 === undefined) {
      if (x.kind === 'E2E' && 재.시나리오.get(x.scenarioId!)?.isActive !== true) return 줄글(seq, `없는 시나리오입니다 (${x.scenarioId})`);
      if (x.kind === 'COMPAT' && 재.호환성.get(x.compatSetId!)?.isActive !== true) return 줄글(seq, `없는 호환성 세트입니다 (${x.compatSetId})`);
      if (a === undefined || a.projectId !== 재.projectId) return 줄글(seq, '다른 프로젝트의 테스트입니다');
      if (x.kind === 'UI' && a.kind === 'API') return 줄글(seq, 'API 애플리케이션에는 UI 테스트가 없습니다');
    }
    if (x.tcIds !== null && a !== undefined) {
      const 있던 = new Set(옛줄?.tcIds ?? []);
      const 모름 = x.tcIds.filter((t) => !있던.has(t) && (!t.startsWith(`${a.prefix}-`) || tcId종류(t) !== x.kind || !재.살아있는케이스.has(t)));
      if (모름.length > 0) return 줄글(seq, `고를 수 없는 케이스입니다 (${모름.join(', ')})`);
    }
    if (a !== undefined && a.projectId === 재.projectId) 쓰는앱.set(a.id, a);
  }

  for (const a of 쓰는앱.values()) {
    const env = 새고름.get(a.id);
    if (env === undefined) return `envs: ${a.prefix} 의 대상 서버가 빠졌습니다`;
    if (옛?.고름.get(a.id) === env) continue;
    const 실서비스 = 재.서버들.get(a.id)?.get(env);
    if (실서비스 === undefined) return `envs: ${a.prefix} 에 ${env} 대상 서버가 없습니다`;
    if (실서비스) return `envs: ${a.prefix} 의 ${env} 는 실서비스 서버라 고를 수 없습니다`;
  }

  // 섞인 E2E — 새 줄이거나 시작 애플리케이션의 서버를 바꿨으면 지나가는 애플리케이션의 같은 이름 줄을 본다
  for (const [i, x] of 새줄.entries()) {
    const a = x.kind === 'E2E' ? 줄앱(x, 재) : undefined;
    const env = a === undefined ? undefined : 새고름.get(a.id);
    if (a === undefined || env === undefined || a.projectId !== 재.projectId) continue;
    if (옛?.줄들.some((o) => 같은줄(o, x)) === true && 옛.고름.get(a.id) === env) continue;
    const 까닭 = 지나가는서버까닭(x, a, env, 재);
    if (까닭 === 'PATH_ENV_GONE') return 줄글(i + 1, `지나가는 애플리케이션에 ${env} 대상 서버가 없습니다`);
    if (까닭 === 'PATH_ENV_PROD') return 줄글(i + 1, `지나가는 애플리케이션의 ${env} 는 실서비스 서버입니다`);
  }
  return null;
}

/** 기준 세트의 꼴 — 애플리케이션 하나의 기능 · UI 줄만 · 매일 또는 요일 (§3.16 「기준 세트의 꼴」). 맞으면 그 애플리케이션 번호 */
export function 기준앱(줄들: readonly 줄[], days: readonly number[] | null): number | null {
  const 앱들 = new Set(줄들.map((x) => x.serviceId));
  if (days === null || 줄들.length === 0 || 앱들.size !== 1 || 줄들.some((x) => x.kind !== 'FN' && x.kind !== 'UI')) return null;
  return 줄들[0]!.serviceId;
}

/** 세트 카드 · 실행 제목에 쓰는 줄 이름 — `기능 전체` · `MKT-FN-033 외 3건` · 시나리오 이름 · 호환성 세트 이름 */
export function 줄이름(x: 줄, 재: 재료): string {
  if (x.kind === 'E2E') return 재.시나리오.get(x.scenarioId!)?.name ?? `시나리오 ${x.scenarioId}`;
  if (x.kind === 'COMPAT') return 재.호환성.get(x.compatSetId!)?.name ?? `호환성 세트 ${x.compatSetId}`;
  if (x.tcIds === null) return `${x.kind === 'FN' ? '기능' : 'UI'} 전체`;
  return x.tcIds.length === 1 ? x.tcIds[0]! : `${x.tcIds[0]} 외 ${x.tcIds.length - 1}건`;
}
