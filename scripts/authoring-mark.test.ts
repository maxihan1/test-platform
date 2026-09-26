// 역방향 표시의 순수 판정 검사 — 자료별로 가르기 · 메모 글 · 피그마 댓글 요청 · 결과 합치기 (도메인/작성 §3.6 「★ 역방향」 표시)
import { describe, expect, it } from 'vitest';

import type { 자료 } from './authoring-assets.js';
import { 메모글, 피그마댓글요청, 피그마실패사유, 표시결과합치기, 표시계획 } from './authoring-mark.js';
import type { 차이 } from './authoring-reverse.js';

const 파일 = (id: number, name: string): 자료 => ({ id, position: id, kind: 'FILE', name, figmaUrl: null });
const 피그마 = (id: number, url: string): 자료 => ({ id, position: id, kind: 'FIGMA', name: url, figmaUrl: url });

function 차(no: string, kind: 차이['kind'], asset: number | null, anchor: string | null = null, node: string | null = null): 차이 {
  return {
    no,
    kind,
    where: null,
    doc: kind === 'SCREEN_ONLY' ? null : '저장',
    screen: kind === 'DOC_ONLY' ? null : '확인',
    tcId: 'PAY-012',
    marked: false,
    markError: '표시는 아직 안 한다',
    표시: { asset, anchor, node },
  };
}

describe('표시계획 — 차이를 자료별로 가른다', () => {
  const 자료들 = [
    파일(1, '결제-기획서.docx'),
    파일(2, '옛기획서.doc'),
    파일(3, '화면정의.pdf'),
    파일(4, '메모.md'),
    피그마(5, 'https://www.figma.com/design/AbC123/?node-id=1-2'),
  ];

  it('워드 자료와 피그마 자료는 할 일로 묶는다 — 차이 순서를 지킨다', () => {
    const 계획 = 표시계획([차('D1', 'DIFFERENT', 1, '저장'), 차('D2', 'SCREEN_ONLY', 5), 차('D3', 'DOC_ONLY', 1, '엑셀')], 자료들);
    expect(계획.할일.map((h) => [h.종류, h.자료.id, h.번호들])).toEqual([
      ['워드', 1, [0, 2]],
      ['피그마', 5, [1]],
    ]);
    expect(계획.못함).toEqual([]);
  });

  it('옛 워드 · PDF · 글 파일은 표시하지 않고 이유를 준다', () => {
    const 계획 = 표시계획([차('D1', 'DIFFERENT', 2), 차('D2', 'DIFFERENT', 3), 차('D3', 'DIFFERENT', 4)], 자료들);
    expect(계획.할일).toEqual([]);
    expect(계획.못함.map((m) => m.사유)).toEqual([
      '옛 워드(.doc)에는 표시하지 못한다',
      'PDF 표시는 아직 안 한다',
      '이 파일 종류에는 표시하지 않는다',
    ]);
  });

  it('자료 번호가 없거나 입력 자료가 아니면 어느 자료의 차이인지 모른다', () => {
    const 계획 = 표시계획([차('D1', 'DIFFERENT', null), 차('D2', 'DIFFERENT', 99)], 자료들);
    expect(계획.못함).toEqual([
      { 번호: 0, 사유: '어느 자료의 차이인지 적혀 있지 않다' },
      { 번호: 1, 사유: '어느 자료의 차이인지 적혀 있지 않다' },
    ]);
  });
});

describe('메모글 — 기획자가 읽는 한 줄', () => {
  it('종류마다 다르게 적고 케이스 번호를 붙인다', () => {
    expect(메모글(차('D1', 'DIFFERENT', 1))).toBe('[D1] 화면과 다름 — 화면: 확인 (PAY-012)');
    expect(메모글(차('D2', 'SCREEN_ONLY', 1))).toBe('[D2] 문서에 없음 — 화면: 확인 (PAY-012)');
    expect(메모글(차('D3', 'DOC_ONLY', 1))).toBe('[D3] 화면에 없음 (PAY-012)');
  });

  it('케이스 번호가 없으면 괄호를 안 붙인다', () => {
    expect(메모글({ ...차('D1', 'DOC_ONLY', 1), tcId: null })).toBe('[D1] 화면에 없음');
  });
});

describe('피그마댓글요청 — 저장된 주소에서 파일 키와 노드를 뽑는다', () => {
  it('차이의 노드가 자료의 노드보다 앞선다', () => {
    expect(피그마댓글요청('https://www.figma.com/design/AbC123/?node-id=1-2', '12:34', '[D1] 문서에 없음')).toEqual({
      주소: 'https://api.figma.com/v1/files/AbC123/comments',
      몸: { message: '[D1] 문서에 없음', client_meta: { node_id: '12:34', node_offset: { x: 0, y: 0 } } },
    });
  });

  it('차이에 노드가 없으면 자료의 노드', () => {
    expect(피그마댓글요청('https://www.figma.com/design/AbC123/?node-id=1-2', null, 'x')?.몸.client_meta?.node_id).toBe('1:2');
  });

  it('둘 다 없으면 파일 전체 댓글', () => {
    expect(피그마댓글요청('https://www.figma.com/design/AbC123/', null, 'x')?.몸).toEqual({ message: 'x' });
  });

  it('저장된 모양이 아니면 null', () => {
    expect(피그마댓글요청('https://evil.test/design/AbC123/', null, 'x')).toBeNull();
    expect(피그마댓글요청('https://www.figma.com/design/../x/', null, 'x')).toBeNull();
  });

  it('실패 코드를 사람 말로 — 403 은 권한 없음과 파일 접근 불가를 같이 말한다', () => {
    expect(피그마실패사유(403)).toBe('피그마 토큰에 댓글 쓰기 권한이 없거나 그 파일에 접근할 수 없다');
    expect(피그마실패사유(401)).toBe('피그마 토큰에 댓글 쓰기 권한이 없거나 그 파일에 접근할 수 없다');
    expect(피그마실패사유(404)).toBe('피그마 파일을 못 찾았다');
    expect(피그마실패사유(500)).toBe('피그마가 댓글을 거절했다 (500)');
  });
});

describe('표시결과합치기 — 차이마다 marked · markError', () => {
  it('된 것은 참, 못 한 것은 이유, 아무도 안 건드린 것은 그대로', () => {
    const 들 = [차('D1', 'DIFFERENT', 1), 차('D2', 'DIFFERENT', 1), 차('D3', 'DIFFERENT', 1)];
    const 결과 = 표시결과합치기(들, [
      { 번호: 0, 됨: true },
      { 번호: 1, 됨: false, 사유: '기획서에서 그 문장을 못 찾았다' },
    ]);
    expect(결과.map((d) => [d.marked, d.markError])).toEqual([
      [true, ''],
      [false, '기획서에서 그 문장을 못 찾았다'],
      [false, '표시는 아직 안 한다'],
    ]);
  });
});
