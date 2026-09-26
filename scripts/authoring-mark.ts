// 역방향 표시의 순수 판정 — 차이를 자료별로 가르기 · 메모 글 · 피그마 댓글 요청 · 결과 합치기 (도메인/작성 §3.6 「★ 역방향」 표시)
// 워드 파일을 여닫는 일은 authoring-docx.ts, 네트워크는 껍데기 authoring-marking.ts 가 한다

import { extname } from 'node:path';

import type { 자료 } from './authoring-assets.js';
import type { 차이 } from './authoring-reverse.js';

/** 한 자료에 몰아서 할 표시. `번호들` 은 차이 목록 안의 자리(0 부터) */
export interface 표시할일 {
  종류: '워드' | '피그마';
  자료: 자료;
  번호들: number[];
}

/**
 * 차이를 자료별로 가른다. 워드(.docx)는 메모 사본 하나로, 피그마는 댓글로 묶는다.
 * 나머지는 **이유를 준다** — 표시는 실패해도 요청을 실패시키지 않는다 (§3.6)
 */
export function 표시계획(diffs: 차이[], 입력자료: 자료[]): { 할일: 표시할일[]; 못함: { 번호: number; 사유: string }[] } {
  const 할일: 표시할일[] = [];
  const 못함: { 번호: number; 사유: string }[] = [];
  diffs.forEach((d, 번호) => {
    const 자 = 입력자료.find((a) => a.id === d.표시?.asset);
    if (자 === undefined) {
      못함.push({ 번호, 사유: '어느 자료의 차이인지 적혀 있지 않다' });
      return;
    }
    const 확장자 = extname(자.name).toLowerCase();
    const 종류 = 자.kind === 'FIGMA' ? '피그마' : 확장자 === '.docx' ? '워드' : null;
    if (종류 === null) {
      // 서버의 pandoc 은 옛 .doc 을 못 읽는다 · PDF 스티커는 새 패키지 승인 뒤 (§3.6 표)
      const 사유 =
        확장자 === '.doc' ? '옛 워드(.doc)에는 표시하지 못한다' : 확장자 === '.pdf' ? 'PDF 표시는 아직 안 한다' : '이 파일 종류에는 표시하지 않는다';
      못함.push({ 번호, 사유 });
      return;
    }
    const 있는것 = 할일.find((h) => h.자료.id === 자.id);
    if (있는것 === undefined) 할일.push({ 종류, 자료: 자, 번호들: [번호] });
    else 있는것.번호들.push(번호);
  });
  return { 할일, 못함 };
}

/** 기획자가 읽는 메모·댓글 한 줄. 차이 번호를 앞에 둬 차이 목록 화면과 같은 차이를 찾게 한다 */
export function 메모글(d: 차이): string {
  const 끝 = d.tcId === null ? '' : ` (${d.tcId})`;
  if (d.kind === 'DIFFERENT') return `[${d.no}] 화면과 다름 — 화면: ${d.screen ?? ''}${끝}`;
  if (d.kind === 'SCREEN_ONLY') return `[${d.no}] 문서에 없음 — 화면: ${d.screen ?? ''}${끝}`;
  return `[${d.no}] 화면에 없음${끝}`;
}

/**
 * 피그마 댓글 요청. 자료 주소는 서버가 정규화해 저장한 모양(`https://www.figma.com/design/<키>/?node-id=12-34`)만 믿는다 —
 * 그 밖이면 null. 노드는 차이가 적은 것이 자료의 것보다 앞선다(같은 파일의 다른 화면일 수 있다)
 */
export function 피그마댓글요청(
  figmaUrl: string,
  node: string | null,
  글: string,
): { 주소: string; 몸: { message: string; client_meta?: { node_id: string; node_offset: { x: 0; y: 0 } } } } | null {
  const 맞음 = /^https:\/\/www\.figma\.com\/design\/([A-Za-z0-9]{1,64})\/(?:\?node-id=(\d{1,10})-(\d{1,10}))?$/.exec(figmaUrl);
  if (맞음 === null) return null;
  const 노드 = node ?? (맞음[2] === undefined ? null : `${맞음[2]}:${맞음[3]}`);
  return {
    주소: `https://api.figma.com/v1/files/${맞음[1]}/comments`,
    몸: { message: 글, ...(노드 === null ? {} : { client_meta: { node_id: 노드, node_offset: { x: 0, y: 0 } } }) },
  };
}

/** 피그마가 거절한 까닭. 403 은 댓글 권한이 없을 때도, 그 파일에 못 닿을 때도 온다 */
export function 피그마실패사유(status: number): string {
  if (status === 401 || status === 403) return '피그마 토큰에 댓글 쓰기 권한이 없거나 그 파일에 접근할 수 없다';
  if (status === 404) return '피그마 파일을 못 찾았다';
  return `피그마가 댓글을 거절했다 (${String(status)})`;
}

/** 표시 결과를 차이에 싣는다. 된 것은 `marked: true` · 이유 빈 글, 못 한 것은 이유. 안 건드린 차이는 그대로 */
export function 표시결과합치기(diffs: 차이[], 결과들: { 번호: number; 됨: boolean; 사유?: string }[]): 차이[] {
  return diffs.map((d, 번호) => {
    const 결과 = 결과들.find((r) => r.번호 === 번호);
    if (결과 === undefined) return d;
    return 결과.됨 ? { ...d, marked: true, markError: '' } : { ...d, marked: false, markError: 결과.사유 ?? '표시하지 못했다' };
  });
}
