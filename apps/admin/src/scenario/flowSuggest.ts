// E2E AI 흐름 후보 — 재료 짓기 · AI 결과 다듬기 (도메인/시나리오 §3.7 결정 15 「AI 흐름 후보」 · §7 「마법사 통로」)
// AI 는 있는 케이스를 고르고 잇기만 한다. 재료에 없는 번호와 지도 밖 값 연결은 admin 이 버린다 — 지어낸 주소는 조용히 안 걸린다(결정 12)

import type { Platform, ScenarioLink, ScenarioPart } from '@platform/kit';

import { 주소틀 } from '../../../../scripts/authoring-crawl-rules.js';

import { 흐름인가 } from './flowSide.js';
import { 값연결제안들, type 값연결제안, type 지도요청 } from './linkSuggest.js';
import { 메뉴뺀연결들, type 연결줄 } from './next.js';
import { 제한시간크기사유 } from './validate.js';

export const 케이스상한 = 1000;
export const 연결상한 = 2000;
export const 요구상한 = 1000;

export interface 흐름재료 {
  platform: Platform;
  wish: string | null;
  /** 게임 애플리케이션이다 — 게임 화면 단계가 없는 후보를 버린다. 이 칸이 생기기 전 일은 없다 */
  game?: boolean;
  reqs: { reqId: string; feature: string; kinds: string[]; text: string }[];
  /** params 는 입력값 칸 이름 · gameScreen 은 게임 애플리케이션에만 단다 */
  cases: { tcId: string; name: string; reqIds: string[]; screens: string[]; normal: boolean; first: string | null; params: string[]; gameScreen?: boolean }[];
  links: { from: string; to: string; via: string }[];
  truncated: boolean;
}

export interface 재료원천 {
  platform: Platform;
  wish: string | null;
  game: boolean;
  prd: { reqId: string; feature: string; text: string }[];
  /** 그 애플리케이션의 활성 기능 테스트 — 디바이스는 여기서 거른다 */
  케이스들: {
    tcId: string;
    name: string;
    platforms: string[];
    techniques: string[];
    stepTitles: string[] | null;
    params: string[];
    /** 케이스 몸통이 받는 이름(catalog/steps.ts) — 게임 애플리케이션만 읽는다. 못 읽었으면 없다 */
    fixtures?: string[] | undefined;
  }[];
  /** 케이스마다 지도 ① 요구(종류 포함)와 지도 ② 화면 주소 */
  맥락: ReadonlyMap<string, { reqs: { reqId: string; axis: string }[]; screens: { url: string | null }[] }>;
  /** 케이스 목록의 hasFeatures — 정상 쪽 판정이 팔레트와 같은 기준을 쓴다 */
  PRD씀: boolean;
  연결들: 연결줄[];
}

/** 재료를 짓는다. 상한을 넘으면 앞에서부터 그만큼만 담고 truncated 를 단다 */
export function 재료짓기(원천: 재료원천): 흐름재료 {
  const 종류들 = new Map<string, Set<string>>();
  for (const [, m] of 원천.맥락) for (const r of m.reqs) 종류들.set(r.reqId, (종류들.get(r.reqId) ?? new Set()).add(r.axis));
  const reqs = 원천.prd.map((i) => ({ reqId: i.reqId, feature: i.feature, kinds: [...(종류들.get(i.reqId) ?? [])].sort(), text: i.text }));

  const cases = 원천.케이스들.filter((c) => c.platforms.includes(원천.platform)).map((c) => {
    const m = 원천.맥락.get(c.tcId);
    const 요구 = m?.reqs ?? [];
    return {
      tcId: c.tcId,
      name: c.name,
      reqIds: [...new Set(요구.map((r) => r.reqId))],
      // 화면 연결과 같은 틀로 맞춘다 — 그래야 AI 가 케이스 화면과 연결을 이어 읽는다
      screens: [...new Set((m?.screens ?? []).flatMap((s) => (s.url === null ? [] : [주소틀(s.url) ?? s.url])))],
      normal: 흐름인가({ reqs: 요구, techniques: c.techniques }, 원천.PRD씀),
      // 첫 절차 제목이 같은 케이스끼리 이으면 뒤 단계가 그 절차(로그인 등)를 건너뛴다 (§3.7 결정 4 「첫 절차 이어받기」)
      first: c.stepTitles?.[0] ?? null,
      // 입력값을 받는 케이스는 앞 단계가 만든 값을 값 연결로 받아야 이어진다 — AI 가 칸 이름을 짐작하지 않고 고르게 한다
      params: c.params,
      // 몸통이 game · driver 를 받아야 게임 화면을 연다. 나머지는 API 만 부른다 (2026-11-09 E2E-F4-03 — ASH 267개 중 218개)
      ...(원천.game ? { gameScreen: (c.fixtures ?? []).some((f) => f === 'game' || f === 'driver') } : {}),
    };
  });

  // 상태는 안 가른다 — 고르고 잇는 데는 출발 · 도착 · 누른 것이면 된다
  const 본 = new Set<string>();
  const links = 메뉴뺀연결들(원천.연결들).flatMap((l) => {
    const 키 = `${l.from}\n${l.to}\n${l.via}`;
    if (본.has(키)) return [];
    본.add(키);
    return [{ from: l.from, to: l.to, via: l.via }];
  });

  return {
    platform: 원천.platform,
    wish: 원천.wish,
    game: 원천.game,
    reqs: reqs.slice(0, 요구상한),
    cases: cases.slice(0, 케이스상한),
    links: links.slice(0, 연결상한),
    truncated: reqs.length > 요구상한 || cases.length > 케이스상한 || links.length > 연결상한,
  };
}

/** AI 가 낸 후보 하나 — perf/ai.ts 의 SUGGEST_FLOWS 모양을 지난 것 */
export interface AI후보 {
  name: string;
  why: string;
  tcIds: string[];
  reqIds: string[];
  links: { toSeq: number; fromSeq: number; param?: string | undefined; jsonPath: string }[];
}

export interface 흐름후보 {
  name: string;
  why: string;
  reqIds: string[];
  steps: { tcId: string; name: string }[];
  links: 값연결제안[];
}

const 앞단계 = (l: ScenarioLink): number | null =>
  l.kind === 'bind' ? l.value.fromSeq : l.kind === 'rewrite' ? l.to.value.fromSeq : l.kind === 'reuse' ? l.fromSeq : null;

function 빈칸(l: ScenarioLink): ('jsonPath' | 'param')[] {
  if (l.kind === 'rewrite') return l.to.value.jsonPath === '' ? ['jsonPath'] : [];
  if (l.kind !== 'bind') return [];
  return [...(l.value.jsonPath === '' ? ['jsonPath' as const] : []), ...(l.param === '' ? ['param' as const] : [])];
}

/**
 * AI 후보를 다듬는다. 재료에 없는 번호 · 한 후보 안에서 겹친 번호를 빼고, 남은 단계가 둘보다 적으면 버린다.
 * 게임 애플리케이션인데 게임 화면 단계가 하나도 없는 후보도 버린다. 버린 까닭은 `버린까닭` 에 모은다 — 다 버려지면 사유로 띄운다.
 * 값 연결은 지도 제안이 같은 두 단계에 낸 것이 있을 때만 그 JSON 경로(값 주입은 비어 있는 입력값 칸까지)를 채운다. 맞는 제안이 없는 짐작은 버린다
 */
export function 흐름다듬기(
  재료: Pick<흐름재료, 'cases' | 'reqs' | 'game'>,
  후보들: readonly AI후보[],
  지도: ReadonlyMap<string, readonly 지도요청[]>,
  입력칸: ReadonlyMap<string, readonly string[]>,
  버린까닭: Set<string> = new Set(),
): 흐름후보[] {
  const 이름 = new Map(재료.cases.map((c) => [c.tcId, c.name]));
  const 게임화면 = new Set(재료.cases.filter((c) => c.gameScreen === true).map((c) => c.tcId));
  const 요구 = new Set(재료.reqs.map((r) => r.reqId));
  return 후보들.flatMap((후보) => {
    // AI 의 번호(1부터) → 남은 차례(1부터)
    const 남은: string[] = [];
    const 새번호 = new Map<number, number>();
    후보.tcIds.forEach((tcId, i) => {
      if (!이름.has(tcId) || 남은.includes(tcId)) return;
      남은.push(tcId);
      새번호.set(i + 1, 남은.length);
    });
    if (남은.length < 2) {
      버린까닭.add('재료에 있는 케이스가 둘보다 적다');
      return [];
    }
    // API 만 이어 붙인 게임 후보는 E2E 가 아니라 묶음 실행이다 (2026-11-09 E2E-F4-03)
    if (재료.game === true && !남은.some((tcId) => 게임화면.has(tcId))) {
      버린까닭.add('게임 화면을 여는 단계가 없다');
      return [];
    }

    const parts: ScenarioPart[] = 남은.map((tcId) => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] }));
    // 실행 한도(60분 · 크기)를 넘는 후보는 시험 실행 · 저장이 어차피 거절한다 — 고른 뒤에 막히지 않게 여기서 버린다 (2026-11-08 E2E-F3-05 시험)
    if (제한시간크기사유(parts).length > 0) {
      버린까닭.add('실행 한도(60분 · 크기)를 넘는다');
      return [];
    }
    const 제안들 = 값연결제안들(parts, 지도, 입력칸);
    const 쓴 = new Set<값연결제안>();
    const links: 값연결제안[] = [];
    for (const 짐작 of 후보.links) {
      const toSeq = 새번호.get(짐작.toSeq);
      const fromSeq = 새번호.get(짐작.fromSeq);
      if (toSeq === undefined || fromSeq === undefined) continue;
      const jsonPath = 짐작.jsonPath.trim();
      // 짐작 하나는 제안 하나만 채운다 — 같은 두 단계에 수정 요청 · 값 주입이 다 있어도 AI 가 낸 것은 하나다.
      // 입력값 칸을 짐작했으면 값 주입을 고른다. 수정 요청을 안 고른 사람 몰래 걸지 않는다
      const 맞는 = 제안들.filter((x) => !쓴.has(x) && x.toSeq === toSeq && 앞단계(x.link) === fromSeq);
      const 제안 = 맞는.find((x) => x.link.kind === (짐작.param === undefined ? 'rewrite' : 'bind')) ?? 맞는[0];
      if (제안 !== undefined) {
        쓴.add(제안);
        let link = 제안.link;
        if (link.kind === 'rewrite') link = { ...link, to: { ...link.to, value: { ...link.to.value, jsonPath } } };
        if (link.kind === 'bind') {
          // 입력값 칸은 그 케이스에 있는 칸 이름만 받는다 — 없는 칸에 넣으면 조립 400 이다
          const 칸 = 짐작.param !== undefined && 입력칸.get(남은[toSeq - 1]!)?.includes(짐작.param) === true ? 짐작.param : '';
          link = { ...link, param: link.param === '' ? 칸 : link.param, value: { ...link.value, jsonPath } };
        }
        links.push({ ...제안, link, needs: 빈칸(link) });
      }
    }
    return [{
      name: 후보.name,
      why: 후보.why,
      reqIds: [...new Set(후보.reqIds.filter((r) => 요구.has(r)))],
      steps: 남은.map((tcId) => ({ tcId, name: 이름.get(tcId)! })),
      links,
    }];
  });
}
