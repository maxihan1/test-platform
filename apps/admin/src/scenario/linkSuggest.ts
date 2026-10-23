// E2E 값 연결 제안 — 서비스 지도로 앞뒤 케이스 단계를 맞춰 수정 요청 · 값 주입을 미리 채운다 (도메인/시나리오 §3.7 결정 15 「값 연결 제안」 · §7)
// 지도에는 응답 내용이 없어 JSON 경로는 비워서 낸다. 화면의 「요청 고르기」도 같은 무늬 변환(linkPattern.ts)을 쓴다 — 둘이 다른 무늬를 만들면 조용히 안 걸린다

import type { ScenarioLink, ScenarioPart } from '@platform/kit';

import { findCase, findService } from '../catalog/store.js';
import { 지도를읽는다 } from '../prd/apiMap.js';

import { 무늬로 } from './linkPattern.js';
import { 케이스접두사 as 접두사 } from './mixed.js';

/** 지도 한 줄에서 제안이 보는 것 — 방식 · 주소 틀 · 거친 케이스 */
export interface 지도요청 {
  method: string;
  path: string;
  cases: { tcId: string }[];
}

export interface 값연결제안 {
  toSeq: number;
  link: ScenarioLink;
  needs: ('jsonPath' | 'param')[];
  why: string;
}

const 한칸끝 = /\/:(?:n|id)$/;
// 낱말 끝의 id(paid · valid)는 아니다 — 칸 이름 전체 · 낙타 꼴 · 밑줄 뒤만 본다
const 아이디칸 = /(?:^id|Id|ID|_id|번호)$/;

type 케이스단계 = Extract<ScenarioPart, { kind: 'case' }>;

/**
 * 초안의 케이스 단계마다 제안을 낸다. 지도 · 입력값 칸은 애플리케이션 접두사 · tcId 로 받는다 — 받지 못한 애플리케이션(작성 read 가 없다)은 안 낸다.
 * 맞는 앞 단계가 여럿이면 가장 가까운 것 하나다. 값 주입은 한 단계에 하나만 낸다 — 같은 칸에 둘이면 조립 400 이다
 */
export function 값연결제안들(
  parts: readonly ScenarioPart[],
  지도: ReadonlyMap<string, readonly 지도요청[]>,
  입력칸: ReadonlyMap<string, readonly string[]>,
): 값연결제안[] {
  const 본 = new Map<string, Set<string>>();
  const 부른 = (apis: readonly 지도요청[], tcId: string): Set<string> => {
    const 있음 = 본.get(tcId);
    if (있음 !== undefined) return 있음;
    const 새것 = new Set(apis.filter((a) => a.cases.some((c) => c.tcId === tcId)).map((a) => `${a.method.toUpperCase()} ${a.path}`));
    본.set(tcId, 새것);
    return 새것;
  };
  // 앞 단계가 그 POST 를 수정 요청으로 바꿨으면 POST 응답이 없다 — 꺼낼 값이 없다
  const 바꿈 = (A: 케이스단계, urlPattern: string) => (A.links ?? []).some((l) => l.kind === 'rewrite' && l.method === 'POST' && l.urlPattern === urlPattern);
  const 제안: 값연결제안[] = [];

  parts.forEach((B, i) => {
    if (B.kind !== 'case' || B.carryOver === false) return;
    const apis = 지도.get(접두사(B.tcId));
    if (apis === undefined) return;
    const 전체 = new Set(apis.map((a) => `${a.method.toUpperCase()} ${a.path}`));
    const B부른 = 부른(apis, B.tcId);
    const 있는 = B.links ?? [];
    const 앞들 = parts.slice(0, i).map((A, j) => ({ A, seq: j + 1 })).reverse()
      .filter((x): x is { A: 케이스단계; seq: number } => x.A.kind === 'case' && 접두사(x.A.tcId) === 접두사(B.tcId));
    const toSeq = i + 1;

    // 수정 요청으로 변경 — 둘 다 같은 모음에 POST 하고 그 모음 한 칸을 고치는 PUT · PATCH 가 지도에 있다
    for (const 키 of B부른) {
      const 모음 = 키.slice('POST '.length);
      if (!키.startsWith('POST ') || 한칸끝.test(모음)) continue;
      const 고침 = (['PUT', 'PATCH'] as const).find((m) => 전체.has(`${m} ${모음}/:n`) || 전체.has(`${m} ${모음}/:id`));
      const urlPattern = 무늬로(모음);
      const 앞 = 앞들.find((x) => 부른(apis, x.A.tcId).has(키) && !바꿈(x.A, urlPattern));
      if (고침 === undefined || 앞 === undefined) continue;
      if (있는.some((l) => l.kind === 'rewrite' && l.method === 'POST' && l.urlPattern === urlPattern)) continue;
      제안.push({
        toSeq,
        link: { kind: 'rewrite', method: 'POST', urlPattern, to: { method: 고침, path: `${모음}/{}`, value: { fromSeq: 앞.seq, method: 'POST', urlPattern, jsonPath: '' } } },
        needs: ['jsonPath'],
        why: `${toSeq}번이 부른 POST ${모음} 을 ${고침} ${모음}/{} 로 바꿔 ${앞.seq}번이 만든 것을 고칩니다`,
      });
    }

    // 값 주입 — 앞 단계가 모음에 POST 하고 이 단계가 그 모음 한 칸을 연다. 입력값 칸이 없으면 꽂을 자리가 없다
    const 칸들 = 입력칸.get(B.tcId) ?? [];
    if (칸들.length === 0) return;
    const 아이디 = 칸들.filter((칸) => 아이디칸.test(칸));
    const param = 아이디.length === 1 ? 아이디[0]! : '';
    for (const 앞 of 앞들) {
      const 열린 = [...B부른].find((키) => {
        const [method, path] = 키.split(' ') as [string, string];
        const 모음 = path.replace(한칸끝, '');
        return ['GET', 'PUT', 'PATCH', 'DELETE'].includes(method) && 모음 !== path && 부른(apis, 앞.A.tcId).has(`POST ${모음}`) && !바꿈(앞.A, 무늬로(모음));
      });
      if (열린 === undefined) continue;
      const 경로 = 열린.split(' ')[1]!;
      const 모음 = 경로.replace(한칸끝, '');
      const urlPattern = 무늬로(모음);
      if (있는.some((l) => l.kind === 'bind' && (param === '' ? l.value.urlPattern === urlPattern : l.param === param))) break;
      제안.push({
        toSeq,
        link: { kind: 'bind', param, value: { fromSeq: 앞.seq, method: 'POST', urlPattern, jsonPath: '' } },
        needs: param === '' ? ['jsonPath', 'param'] : ['jsonPath'],
        why: `${앞.seq}번이 부른 POST ${모음} 응답의 값을 ${toSeq}번이 여는 ${모음}/{} 에 넣습니다`,
      });
      break;
    }
  });
  return 제안;
}

/**
 * 제안 재료 — 애플리케이션마다 서비스 지도, 케이스마다 입력값 칸. 입력값 칸은 DB 의 입력 스키마에서 읽는다 — 케이스 파일을 열 까닭이 없다.
 * 비활성 · 없는 케이스는 칸이 없는 것으로 친다. 받은 애플리케이션 밖의 케이스는 안 읽는다
 */
export async function 제안재료읽기(앱들: readonly string[], tcIds: readonly string[]): Promise<{ 지도: Map<string, 지도요청[]>; 입력칸: Map<string, string[]> }> {
  const 지도 = new Map(await Promise.all(앱들.map(async (앱) => {
    const 서비스 = await findService(앱);
    return [앱, 서비스 === null ? [] : (await 지도를읽는다(서비스.id)).apis] as const;
  })));
  const 번호 = [...new Set(tcIds.filter((t) => 앱들.includes(접두사(t))))];
  const 입력칸 = new Map(await Promise.all(번호.map(async (tcId) => {
    const 행 = await findCase(tcId);
    const 칸들: unknown = 행?.isActive ? 행.paramSchema?.properties : undefined;
    return [tcId, typeof 칸들 === 'object' && 칸들 !== null ? Object.keys(칸들) : []] as const;
  })));
  return { 지도, 입력칸 };
}
