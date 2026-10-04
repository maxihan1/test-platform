// 요구 지문 파일 검사 — 자료마다 합치기 · 앞 판과 견주기 · 반영 때 세 갈래 합치기 · PR 머리 한 줄
import { describe, expect, it } from 'vitest';

import type { 원장 } from './authoring-ledger.js';
import { type 지문파일, 지문세갈래, 지문파일글, 지문파일읽기, 지문합치기, 차이줄, 판견주기 } from './authoring-ledger-diff.js';

const 지 = (c: string) => c.repeat(16);
const 원장꼴 = (항목: [string, string, string][], 모드: Record<string, '번호' | '문단'>, 꼴: Record<string, string>): 원장 => ({
  항목: 항목.map(([번호, 자료, 지문]) => ({ 번호, 자료, 지문 })),
  가족: {},
  모드,
  경고: [],
  빠진자료: [],
  꼴,
});
const 파일 = (항목: [string, string, string][], 자료: Record<string, string>): 지문파일 => ({
  판: 1,
  자료: Object.fromEntries(Object.entries(자료).map(([k, 꼴]) => [k, { 꼴 }])),
  항목: 항목.map(([번호, 자료이름, 지문]) => ({ 번호, 자료: 자료이름, 지문 })),
});

describe('지문 파일 글 · 읽기', () => {
  it('쓰고 다시 읽으면 같다 — 번호 차례를 지킨다', () => {
    const f = 파일([['REQ-A-2', '가.docx', 지('a')], ['REQ-A-1', '가.docx', 지('b')]], { '가.docx': '.docx/pandoc' });
    expect(지문파일읽기(지문파일글(f))).toEqual(f);
  });

  it('모양이 틀리거나 1MiB 를 넘으면 null 이다 — 자식이나 사람이 손댄 파일로 차이를 지어내지 않는다', () => {
    expect(지문파일읽기('{')).toBeNull();
    expect(지문파일읽기(JSON.stringify({ 판: 2, 자료: {}, 항목: [] }))).toBeNull();
    expect(지문파일읽기(JSON.stringify({ 판: 1, 자료: { '가.docx': { 꼴: '.docx/pandoc' } }, 항목: [{ 번호: 'REQ-A-1', 자료: '가.docx', 지문: 'xyz' }] }))).toBeNull();
    expect(지문파일읽기(JSON.stringify({ 판: 1, 자료: {}, 항목: [{ 번호: 'REQ-A-1', 자료: '없는.docx', 지문: 지('a') }] }))).toBeNull();
    expect(지문파일읽기(`{"판":1,"자료":{},"항목":[],"x":"${'가'.repeat(400_000)}"}`)).toBeNull();
  });
});

describe('자료마다 합치기 (게이트 1 — 개정분만 보낸 요청이 앞 판 전체를 지움으로 만들지 않게)', () => {
  it('이번 원장 자료의 항목만 바꾸고 다른 자료 항목은 물려받는다', () => {
    const 앞 = 파일([['REQ-A-1', '가.docx', 지('a')], ['REQ-B-1', '개정.docx', 지('b')]], { '가.docx': '.docx/pandoc', '개정.docx': '.docx/pandoc' });
    const 새 = 원장꼴([['REQ-A-1', '가.docx', 지('c')], ['REQ-A-2', '가.docx', 지('d')]], { '가.docx': '번호' }, { '가.docx': '.docx/pandoc' });
    expect(지문합치기(앞, 새)).toEqual(
      파일([['REQ-B-1', '개정.docx', 지('b')], ['REQ-A-1', '가.docx', 지('c')], ['REQ-A-2', '가.docx', 지('d')]], { '개정.docx': '.docx/pandoc', '가.docx': '.docx/pandoc' }),
    );
  });

  it('앞 판이 없으면 이번 원장 그대로다', () => {
    const 새 = 원장꼴([['REQ-A-1', '가.docx', 지('a')]], { '가.docx': '번호' }, { '가.docx': '.md/그대로' });
    expect(지문합치기(null, 새)).toEqual(파일([['REQ-A-1', '가.docx', 지('a')]], { '가.docx': '.md/그대로' }));
  });
});

describe('앞 판과 견주기', () => {
  const 앞 = 파일(
    [['REQ-A-1', '가.docx', 지('a')], ['REQ-A-2', '가.docx', 지('b')], ['REQ-A-3', '가.docx', 지('c')], ['REQ-B-1', '개정.docx', 지('d')]],
    { '가.docx': '.docx/pandoc', '개정.docx': '.docx/pandoc' },
  );

  it('번호 모드는 더함 · 바뀜 · 지움을 가르고, 지움은 앞 판 같은 자료에만 있던 번호다', () => {
    const 새 = 원장꼴([['REQ-A-1', '가.docx', 지('a')], ['REQ-A-2', '가.docx', 지('e')], ['REQ-A-4', '가.docx', 지('f')]], { '가.docx': '번호' }, { '가.docx': '.docx/pandoc' });
    expect(판견주기(앞, 새)).toEqual({ 더함: ['REQ-A-4'], 바뀜: ['REQ-A-2'], 지움: ['REQ-A-3'], 짝: [], 새자료: [], 꼴다름: [] });
  });

  it('앞 판에 없는 자료는 더함이 아니라 새 자료로 센다 — 파일 이름만 바뀐 새 판에서 거짓 더함 · 지움이 안 나온다', () => {
    const 새 = 원장꼴([['REQ-A-1', '가 v2.docx', 지('a')]], { '가 v2.docx': '번호' }, { '가 v2.docx': '.docx/pandoc' });
    expect(판견주기(앞, 새)).toEqual({ 더함: [], 바뀜: [], 지움: [], 짝: [], 새자료: ['가 v2.docx'], 꼴다름: [] });
  });

  it('글자본 꼴이 다르면 그 자료는 견주지 않는다 — 서버와 맥은 같은 워드를 다르게 푼다', () => {
    const 새 = 원장꼴([['REQ-A-1', '가.docx', 지('z')]], { '가.docx': '번호' }, { '가.docx': '.docx/textutil' });
    expect(판견주기(앞, 새)).toEqual({ 더함: [], 바뀜: [], 지움: [], 짝: [], 새자료: [], 꼴다름: ['가.docx'] });
  });

  it('문단 모드는 같은 자료 안에서 지문으로 짝짓는다 — 번호가 밀린 짝을 돌려주고, 고친 문단은 지움 하나 + 더함 하나다', () => {
    const 문단앞 = 파일([['P-001', '나.md', 지('1')], ['P-002', '나.md', 지('2')], ['P-003', '나.md', 지('3')]], { '나.md': '.md/그대로' });
    const 새 = 원장꼴(
      [['P-001', '나.md', 지('9')], ['P-002', '나.md', 지('1')], ['P-003', '나.md', 지('2')], ['P-004', '나.md', 지('8')]],
      { '나.md': '문단' },
      { '나.md': '.md/그대로' },
    );
    expect(판견주기(문단앞, 새)).toEqual({
      더함: ['P-001', 'P-004'],
      바뀜: [],
      지움: ['P-003'],
      짝: [{ 앞: 'P-001', 새: 'P-002' }, { 앞: 'P-002', 새: 'P-003' }],
      새자료: [],
      꼴다름: [],
    });
  });
});

describe('PR 머리 한 줄', () => {
  it('차이 · 새 자료 · 꼴 다름을 한 줄로, 번호는 앞 10개까지', () => {
    const 많이 = Array.from({ length: 12 }, (_, i) => `REQ-A-${String(i + 1)}`);
    expect(차이줄({ 더함: 많이, 바뀜: ['REQ-B-1'], 지움: [], 짝: [], 새자료: ['다.docx'], 꼴다름: ['가.docx'] })).toBe(
      `기획서 판 차이 — 더함 12(${많이.slice(0, 10).join(' · ')} …) · 바뀜 1(REQ-B-1) · 지움 0 · 새 자료 1(다.docx) · 글자본 꼴이 달라 견주지 않음 — 가.docx`,
    );
  });

  it('앞 판이 없거나 못 읽으면 그렇게 말한다', () => {
    expect(차이줄('앞 판 없음')).toBe('기획서 판 차이 — 앞 판 지문 없음(반영하면 저장된다)');
    expect(차이줄('못 읽음')).toBe('⚠️ 앞 판 지문을 못 읽음');
  });
});

describe('반영 때 세 갈래 합치기 (게이트 1 — 요청이 바꾼 것이 이기고 main 이 새로 넣은 다른 자료는 남는다)', () => {
  const 바탕 = 파일([['REQ-A-1', '가.docx', 지('a')], ['REQ-A-2', '가.docx', 지('b')]], { '가.docx': '.docx/pandoc' });

  it('요청이 바꾼 항목이 이기고, 요청이 지운 항목은 빠지고, main 이 새로 넣은 다른 자료 항목은 남는다', () => {
    const main = 파일([['REQ-A-1', '가.docx', 지('m')], ['REQ-A-2', '가.docx', 지('b')], ['REQ-C-1', '다.docx', 지('c')]], { '가.docx': '.docx/pandoc', '다.docx': '.md/그대로' });
    const 요청 = 파일([['REQ-A-1', '가.docx', 지('r')]], { '가.docx': '.docx/pandoc' });
    expect(지문세갈래(바탕, main, 요청)).toEqual(
      파일([['REQ-A-1', '가.docx', 지('r')], ['REQ-C-1', '다.docx', 지('c')]], { '가.docx': '.docx/pandoc', '다.docx': '.md/그대로' }),
    );
  });

  it('요청이 안 건드린 항목은 main 것을 따른다', () => {
    const main = 파일([['REQ-A-1', '가.docx', 지('m')]], { '가.docx': '.docx/pandoc' });
    expect(지문세갈래(바탕, main, 바탕)).toEqual(main);
  });

  it('바탕이 없으면 둘을 합치고 같은 번호는 요청 것 · 한쪽이 지웠으면 남은 쪽', () => {
    const main = 파일([['REQ-A-1', '가.docx', 지('m')], ['REQ-C-1', '다.docx', 지('c')]], { '가.docx': '.docx/pandoc', '다.docx': '.md/그대로' });
    const 요청 = 파일([['REQ-A-1', '가.docx', 지('r')]], { '가.docx': '.docx/pandoc' });
    expect(지문세갈래(null, main, 요청)).toEqual(
      파일([['REQ-A-1', '가.docx', 지('r')], ['REQ-C-1', '다.docx', 지('c')]], { '가.docx': '.docx/pandoc', '다.docx': '.md/그대로' }),
    );
    expect(지문세갈래(바탕, main, null)).toEqual(main);
    expect(지문세갈래(바탕, null, 요청)).toEqual(요청);
  });
});
