// 설계 판정의 글자본 꼴 검사 — 같은 기획서를 md 로 받든 서버 변환(pandoc)으로 받든 요구마다 같은 설계가 나오는지
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 원장뽑기 } from './authoring-ledger.js';

const 읽기 = (이름: string) => readFileSync(new URL(`./fixtures/ledger/${이름}`, import.meta.url), 'utf8');
// 워드 변환은 곧은 따옴표를 둥근 따옴표로 바꾼다 — 근거 글자만 다르고 판정은 같아야 한다
const 따옴표 = (글: string) => 글.replace(/\\"/g, '"').replace(/[“”]/g, '"');
const 로그인근거 = (글: string, 이름: string) =>
  new Map(원장뽑기(글, 이름).항목.map((h) => [h.번호, (h.설계?.예외 ?? []).filter((e) => e.근거.startsWith('로그인:')).map((e) => `${e.기법} ${e.근거}`)]));

describe('설계 — 글자본 꼴이 달라도 같다', () => {
  it('데모마켓 md 원본과 서버 변환본의 설계가 172 요구마다 같고 경계 32 · 예외 64 다', () => {
    const md = 원장뽑기(읽기('demomarket.md'), '기획서.md');
    const 서버 = new Map(원장뽑기(읽기('demomarket-pandoc.txt'), '기획서.docx').항목.map((h) => [h.번호, h.설계]));
    expect(md.항목).toHaveLength(172);
    for (const h of md.항목) {
      expect([h.번호, 따옴표(JSON.stringify(h.설계 ?? null))]).toEqual([h.번호, 따옴표(JSON.stringify(서버.get(h.번호) ?? null))]);
    }
    expect([md.항목.filter((h) => (h.설계?.경계.length ?? 0) > 0).length, md.항목.filter((h) => (h.설계?.예외.length ?? 0) > 0).length]).toEqual([32, 64]);
  });

  it('요구 번호(REQ-401 · REQ-MEM-501~503)의 숫자는 HTTP 번호 · 한도로 읽지 않는다', () => {
    const 글 = [
      '| REQ-401 | 주문 목록을 최신순으로 보여 준다 |',
      '| REQ-402 | 주문 상세를 보여 준다 |',
      '| REQ-403 | 주문 상태를 보여 준다 |',
      '- REQ-MEM-501~503 회원 정보를 보여 준다',
    ].join('\n');
    expect(원장뽑기(글, '기획서.md').항목.filter((h) => h.설계 !== undefined)).toEqual([]);
  });
});

describe('설계 — 표 「로그인」 열 (AUT-F3-45 — 행 글에 열 이름이 없어도 401 · 권한 예외를 잡는다)', () => {
  it.each([
    ['md', 'demomarket.md', '기획서.md'],
    ['서버 변환', 'demomarket-pandoc.txt', '기획서.docx'],
  ])('데모마켓 %s 꼴은 예 · 관리자 18 줄을 잡고 아니오 줄은 안 잡는다', (_꼴, 파일, 이름) => {
    const 근거 = 로그인근거(읽기(파일), 이름);
    expect(['REQ-API-013', 'REQ-API-034', 'REQ-API-051', 'REQ-API-010', 'REQ-API-016'].map((n) => 근거.get(n))).toEqual([
      ['동등 분할 로그인: 예'],
      ['동등 분할 로그인: 예'],
      ['동등 분할 로그인: 저장만 관리자'],
      [],
      [],
    ]);
    expect([...근거.values()].filter((v) => v.length > 0)).toHaveLength(18);
  });

  it('맥 변환 꼴(칸마다 한 줄)도 머리 칸과 행 칸을 맞춰 읽고, 칸 수가 머리와 다른 행은 안 잡는다', () => {
    const 글 = [
      '11.2 엔드포인트 목록',
      'ID', '메서드 · 경로', '설명', '로그인',
      'REQ-API-013', 'POST /api/auth/logout', '로그아웃 204', '예',
      'REQ-API-010', 'POST /api/auth/signup', '회원가입', '아니오',
      'REQ-API-050', 'GET /api/admin/users', '회원 목록', '잠금 해제는 따로 연다', '관리자',
    ].join('\n');
    expect(로그인근거(글, '기획서.docx')).toEqual(new Map([['REQ-API-013', ['동등 분할 로그인: 예']], ['REQ-API-010', []], ['REQ-API-050', []]]));
  });

  it('맥 변환 꼴은 제목과 표 사이 안내 문장 · 행 번호 칸이 있어도 머리를 뒤에서부터 맞춘다', () => {
    const 글 = [
      '11.2 엔드포인트 목록',
      '아래 표는 화면이 쓰는 API 다',
      'No', 'ID', '경로', '로그인',
      '1', 'REQ-API-013', 'POST /api/auth/logout', '예',
      '2', 'REQ-API-010', 'POST /api/auth/signup', '아니오',
      '3', 'REQ-API-039', 'GET /api/coupons', 'O',
    ].join('\n');
    expect(로그인근거(글, '기획서.docx')).toEqual(new Map([['REQ-API-013', ['동등 분할 로그인: 예']], ['REQ-API-010', []], ['REQ-API-039', ['동등 분할 로그인: O']]]));
  });

  it('서버 변환 꼴에서 제목 없이 이어진 다음 표는 그 머리로 읽는다', () => {
    const 글 = [
      '11.2 엔드포인트 목록',
      'ID            경로             설명          로그인',
      'REQ-API-013   POST /logout     로그아웃      예',
      'REQ-API-010   POST /signup     회원가입      아니오',
      'ID            요구             비고          필수',
      'REQ-API-020   목록을 보여 준다   없음          예',
    ].join('\n');
    expect(로그인근거(글, '기획서.docx')).toEqual(new Map([['REQ-API-013', ['동등 분할 로그인: 예']], ['REQ-API-010', []], ['REQ-API-020', []]]));
  });

  it('「인증」 머리 · 기호 값도 읽고, 다른 이름의 열에 든 「예」는 안 잡고, 같은 번호가 뒤에 또 나와도 표 행을 쓴다', () => {
    const 글 = [
      '| ID | 경로 | 인증 필요 |', '|---|---|---|',
      '| REQ-A-001 | `GET /a` | 필요 |', '| REQ-A-002 | `GET /b` | 불필요 |', '| REQ-A-004 | `GET /c` | ✓ |',
      '| ID | 요구 | 필수 |', '|---|---|---|',
      '| REQ-A-003 | 로고가 보인다 | 예 |',
      '### REQ-A-001 상세',
      '`GET /a` 는 목록을 준다.',
    ].join('\n');
    expect(로그인근거(글, '기획서.md')).toEqual(
      new Map([['REQ-A-001', ['동등 분할 로그인: 필요']], ['REQ-A-002', []], ['REQ-A-004', ['동등 분할 로그인: ✓']], ['REQ-A-003', []]]),
    );
  });
});
