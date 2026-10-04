// 화면 기록 저장본 판정 검사 — 모양 · 이름 · 기록 주소 · 견주기 · 갈기 (도메인/작성 §3.6 「★ 역방향」 · 2026-10-04)
import { describe, expect, it } from 'vitest';

import { type 저장항목, 갈기, 견주기, 기록주소, 이번것들, 저장본모양, 저장이름 } from './authoring-screens-keep.js';

const 항목 = (덧: Partial<저장항목> = {}): 저장항목 => ({
  키: '로그인 /my', 상태: '로그인', 틀: '/my', 주소: 'https://s.test/my', 지문: 'a', 글자지문: 'g', 기록: 'in-0123456789ab.md', 훑은날: '2026-10-01', ...덧,
});

describe('저장본모양 — 사람 · 자식이 고친 파일을 그대로 믿지 않는다', () => {
  it('맞는 모양은 그대로', () => {
    expect(저장본모양({ 판: 1, 항목: [항목()] }).항목).toHaveLength(1);
  });

  it('틀리면 빈 저장본 · 틀린 항목만 뺀다', () => {
    expect(저장본모양('x').항목).toEqual([]);
    expect(저장본모양({ 판: 2, 항목: [항목()] }).항목).toEqual([]);
    expect(저장본모양({ 판: 1, 항목: [항목(), { 키: 1 }, 항목({ 기록: '../etc/passwd' })] }).항목).toHaveLength(1);
  });
});

describe('저장이름 — 상태 + 틀로 정해 실행마다 같다', () => {
  it('영문 소문자 · 숫자만', () => {
    expect(저장이름('로그인', '/my')).toMatch(/^in-[0-9a-f]{12}\.md$/);
    expect(저장이름('로그아웃', '/my')).toMatch(/^out-[0-9a-f]{12}\.md$/);
    expect(저장이름('로그인', '/my')).toBe(저장이름('로그인', '/my'));
  });
});

describe('기록주소 — 기록 첫 줄 `# <크롤 주소>`', () => {
  it('읽는다', () => {
    expect(기록주소('# https://s.test/my\n## 요소\n- 버튼')).toBe('https://s.test/my');
  });

  it('없거나 주소가 아니면 null', () => {
    expect(기록주소('## 요소')).toBeNull();
    expect(기록주소('# 내 정보')).toBeNull();
  });
});

describe('견주기 — 글자 지문까지 같고 30일 안이면 같음', () => {
  const 목록 = [
    { 주소: 'https://s.test/my', 상태: '로그인' as const, 틀: '/my', 지문: 'a', 글자지문: 'g' },
    { 주소: 'https://s.test/cart', 상태: '로그인' as const, 틀: '/cart', 지문: 'b', 글자지문: 'h2' },
    { 주소: 'https://s.test/new', 상태: '로그인' as const, 틀: '/new', 지문: 'c', 글자지문: 'k' },
  ];
  const 저장 = { 판: 1 as const, 항목: [항목(), 항목({ 키: '로그인 /cart', 틀: '/cart', 주소: 'https://s.test/cart', 글자지문: 'h1', 기록: 'in-c.md' }), 항목({ 키: '로그아웃 /old', 상태: '로그아웃', 틀: '/old', 기록: 'out-o.md', 훑은날: '2026-09-20' })] };

  it('같음 · 바뀜 · 새 화면 · 못 본 화면 · 가장 오래된 날수', () => {
    const r = 견주기(목록, 저장, '2026-10-04');
    expect(r.표시.get('https://s.test/my')).toEqual({ 저장본: '같음', 저장기록: 'in-0123456789ab.md' });
    expect(r.표시.get('https://s.test/cart')).toEqual({ 저장본: '바뀜' });
    expect(r.표시.get('https://s.test/new')).toEqual({ 저장본: '새 화면' });
    expect(r.못본.map((x) => x.키)).toEqual(['로그아웃 /old']);
    expect(r.가장오래된).toBe(3);
  });

  it('30일이 지난 기록은 바뀜으로 본다', () => {
    const r = 견주기(목록.slice(0, 1), { 판: 1, 항목: [항목({ 훑은날: '2026-09-01' })] }, '2026-10-04');
    expect(r.표시.get('https://s.test/my')).toEqual({ 저장본: '바뀜' });
  });
});

describe('이번것들 — 기록 첫 줄 주소로 목록과 맞춘다', () => {
  it('맞는 것만 저장한다 — 이름이 아니라 주소로', () => {
    const 목록 = [{ 주소: 'https://s.test/my', 상태: '로그인' as const, 틀: '/my', 지문: 'a', 글자지문: 'g' }];
    const r = 이번것들(목록, [{ 이름: 'in-007.md', 글: '# https://s.test/my\n본문' }, { 이름: 'extra-1-popup.md', 글: '# https://s.test/popup\n' }, { 이름: 'x.md', 글: '내용' }], '2026-10-04');
    expect(r).toEqual([{ 키: '로그인 /my', 상태: '로그인', 틀: '/my', 주소: 'https://s.test/my', 지문: 'a', 글자지문: 'g', 기록: 저장이름('로그인', '/my'), 훑은날: '2026-10-04', 원본: 'in-007.md' }]);
  });
});

describe('갈기 — 이번에 본 화면만 갈고, 지우기는 다 봤을 때만', () => {
  const 저장 = { 판: 1 as const, 항목: [항목(), 항목({ 키: '로그인 /a', 틀: '/a' })] };

  it('본 것만 바꾸고 나머지는 남긴다', () => {
    const r = 갈기(저장, [항목({ 글자지문: '새' })], false);
    expect(r.항목.map((x) => `${x.키} ${x.글자지문}`)).toEqual(['로그인 /my 새', '로그인 /a g']);
  });

  it('지우기면 이번에 본 것만 남긴다', () => {
    expect(갈기(저장, [항목()], true).항목.map((x) => x.키)).toEqual(['로그인 /my']);
  });
});
