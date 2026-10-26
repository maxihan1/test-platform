// 기능 묶음은 원본 기획서 제목에서만 — 제목 뽑기 · 제목 밖 묶음 · PR 머리 경고 줄 (도메인/작성 §3.6 「항목 — 칸 다섯」 기능 묶음 · PRD-F16-02)
import { describe, expect, it } from 'vitest';

import type { 읽을자료 } from './authoring-assets.js';
import { 원장만들기, 제목들 } from './authoring-ledger.js';
import { type 옮긴항목, 대조줄들, 제목밖묶음 } from './authoring-prd.js';

const 항목 = (feature: string, 번호: { reqId?: string; 임시?: string }): 옮긴항목 => ({
  ...번호,
  feature,
  text: '규칙 하나',
  basis: [{ from: '기획서.docx', quote: '규칙 하나' }],
  status: 'CONFIRMED',
});

describe('제목들 — 자료의 제목 줄에서 번호 · 표시 · 코드 괄호를 뗀다', () => {
  it('md 는 # 줄만, 끝의 영문 코드 괄호만 뗀다 — 한글 괄호와 번호 목록은 그대로', () => {
    const md = '# 7. 주문 (ORD)\n## 7.1 주문서 작성\n1. 주문 버튼을 누른다\n## 1.1 메뉴 구조 (화면 깊이)\n# 7. 주문 (ORD)';
    expect(제목들(md)).toEqual(['주문', '주문서 작성', '메뉴 구조 (화면 깊이)']);
  });

  it('변환한 글자본은 점 번호 뒤 빈칸 하나인 짧은 줄 · 엑셀은 시트 머리', () => {
    expect(제목들('8. 마이페이지 (MY)\n1.  아이디는 4자 이상이다\n9. 고객센터 (CS)')).toEqual(['마이페이지', '고객센터']);
    expect(제목들('# 시트: 강화 확률\n단계,성공\n+7,40%')).toEqual(['강화 확률']);
  });

  it('원장만들기가 자료마다 모아 원본 원장에 싣는다', () => {
    const 계획: 읽을자료[] = [
      { kind: 'FILE', id: 1, name: '가.docx', 받을자리: '/a/1.docx', 변환: { 명령: 'pandoc', 인자: [] }, 읽을자리: '/a/1.txt' },
      { kind: 'FILE', id: 2, name: '나.md', 받을자리: '/a/2.md', 변환: null, 읽을자리: '/a/2.md' },
    ];
    const 글들: Record<string, string> = { '/a/1.txt': '9. 고객센터 (CS)\n문의 글은 1000자까지 쓴다', '/a/2.md': '# 주문\n주문은 로그인이 필요하다\n# 고객센터' };
    const r = 원장만들기(계획, (p) => 글들[p] ?? null);
    expect('원장' in r && r.원장.제목).toEqual(['고객센터', '주문']);
  });
});

describe('제목밖묶음 — 기능 묶음이 원본 기획서 제목에 없는 항목', () => {
  it('묶음마다 번호(없으면 임시 번호)를 모은다', () => {
    const items = [항목('주문', { reqId: 'MKT-REQ-001' }), 항목('주문서', { 임시: 'MKT-NEW-001' }), 항목('1:1 문의', { reqId: 'MKT-REQ-002' }), 항목('주문서', { reqId: 'MKT-REQ-003' })];
    expect(제목밖묶음(items, ['주문', '고객센터'])).toEqual(['「주문서」(MKT-NEW-001 · MKT-REQ-003)', '「1:1 문의」(MKT-REQ-002)']);
  });

  it('제목이 없는 원본(화면만 · 피그마 · PDF · 칸이 생기기 전 사본)은 안 본다', () => {
    expect(제목밖묶음([항목('주문서', { reqId: 'MKT-REQ-001' })], [])).toEqual([]);
    expect(제목밖묶음([항목('주문서', { reqId: 'MKT-REQ-001' })], undefined)).toEqual([]);
  });

  it('PR 머리 대조 줄에 경고로 싣고, 없으면 줄이 없다', () => {
    const r = { 요구수: 1, 빠짐: [], 요구아님: [], 설계잃음: [] };
    expect(대조줄들(r, ['「주문서」(MKT-NEW-001)'])).toContain('⚠️ 기획서 제목에 없는 기능 묶음 1 — 「주문서」(MKT-NEW-001)');
    expect(대조줄들(r).some((줄) => 줄.includes('기능 묶음'))).toBe(false);
  });
});
