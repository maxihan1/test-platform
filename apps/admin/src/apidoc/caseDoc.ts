// 케이스가 만들어진 API 문서 판을 실행 요청에 싣는다 — 정식 · 테스트 · E2E 실행이 같이 쓴다 (도메인/API §3.8 「응답 모양 확인」)

import type { ApiDocRef } from '@platform/kit';

import { 판원문 } from './store.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 케이스판결과 = { apiDoc?: ApiDocRef } | { 사유: string };

// ponytail: 최근 판 넷만 쥔다. 판은 지우지도 고치지도 않아 비울 까닭이 크기(판마다 5MB 까지)뿐이다
const 담아둔판 = new Map<string, Promise<ApiDocRef | null>>();
const 담는수 = 4;

function 판가져오기(serviceId: number, version: number): Promise<ApiDocRef | null> {
  const 키 = `${serviceId}/${version}`;
  const 있음 = 담아둔판.get(키);
  if (있음 !== undefined) return 있음;
  const 값 = 판원문(serviceId, version).then((r) => (r === null ? null : { version: r.version, doc: r.doc }));
  // 못 읽은 것 · 없는 판은 담지 않는다 — 다음 항목이 같은 실패를 받거나 뒤에 생긴 판을 못 보지 않게
  값.then(
    (판) => 판 === null && 담아둔판.delete(키),
    () => 담아둔판.delete(키),
  );
  담아둔판.set(키, 값);
  if (담아둔판.size > 담는수) 담아둔판.delete(담아둔판.keys().next().value as string);
  return 값;
}

/**
 * API 애플리케이션 케이스면 그 케이스 판 원문, 화면 애플리케이션이면 빈 객체.
 * 케이스에 판이 안 적혔거나 그 판이 없으면 미실행 사유다 — 모양 확인 없이 조용히 통과하지 않게
 */
export async function 케이스판(tcId: string): Promise<케이스판결과> {
  const r = await (await db()).query<{ id: string; kind: string; api_doc: number | null }>(
    `SELECT s.id, s.kind, c.api_doc
       FROM test_case c JOIN service s ON s.prefix = split_part(c.tc_id, '-', 1)
      WHERE c.tc_id = $1`,
    [tcId],
  );
  const 줄 = r.rows[0];
  if (줄 === undefined || 줄.kind !== 'API') return {};
  if (줄.api_doc === null) return { 사유: '케이스에 API 문서 판이 적혀 있지 않습니다' };
  const 판 = await 판가져오기(Number(줄.id), 줄.api_doc);
  return 판 === null ? { 사유: `API 문서 판 ${줄.api_doc} 가 없습니다` } : { apiDoc: 판 };
}

/**
 * E2E case 부품의 판. 있으면 싣고, 없거나 화면 애플리케이션이면 빈 객체 — 시나리오는 부품 하나 때문에 통째로 미실행이 되지 않는다.
 * 부품 기록(scenario_run_part.part)에는 넣지 않는다 (도메인/API §3.8 「API 인증」 E2E)
 */
export async function 부품판(part: { kind: string; tcId?: string }): Promise<{ apiDoc?: ApiDocRef }> {
  if (part.kind !== 'case' || part.tcId === undefined) return {};
  const 결과 = await 케이스판(part.tcId);
  return 'apiDoc' in 결과 && 결과.apiDoc !== undefined ? { apiDoc: 결과.apiDoc } : {};
}
