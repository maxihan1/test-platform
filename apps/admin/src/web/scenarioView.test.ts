import type { ScenarioPart } from '@platform/kit';
import { TECHNIQUES } from '@platform/kit/types';
import { describe, expect, it } from 'vitest';

import type { CaseRow } from './api.js';
import type { CasePartMaterial } from './scenarioApi.js';
import type { Field } from './schema.js';
import {
  가리킴빈곳,
  모킹구간,
  빼기,
  순서바꾸기,
  이미실행,
  넘겨받기끄기,
  조립값,
  카드요약,
  케이스바꾸기,
  팔레트차례,
  type 재료들,
} from './scenarioView.js';

type CasePart = Extract<ScenarioPart, { kind: 'case' }>;

const 케이스 = (tcId: string, extra: Partial<CasePart> = {}): CasePart => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], ...extra,
});
const 응답 = (fromSeq: number) => ({ fromSeq, method: 'GET' as const, urlPattern: '**/api/x', jsonPath: 'data.id' });

const 재료 = (steps: string[]): CasePartMaterial => ({
  tcId: 'X', name: 'x', platforms: ['desktop'], precondition: [], paramSchema: {}, expectedSchema: {},
  steps: steps.map((title) => ({ title, skippable: true })), r16: false, unconfirmed: null,
});

describe('카드요약', () => {
  it('재료가 없으면 빈 글자', () => {
    expect(카드요약(케이스('A-1'), null, 'ko')).toBe('');
    expect(카드요약(케이스('A-1'), undefined, 'ko')).toBe('');
  });

  it('건너뜀 · 입력값 · 값 연결 조각을 가운뎃점으로 잇는다', () => {
    expect(카드요약(케이스('A-1'), 재료([]), 'ko')).toBe('준비 전부 실행 · 저장값 사용');
    const 많이 = 케이스('A-1', {
      skipSteps: ['가', '나'], params: { a: 1 }, expected: { b: 2, c: 3 },
      links: [{ kind: 'block', method: 'GET', urlPattern: '**/x' }],
    });
    expect(카드요약(많이, 재료([]), 'ko')).toBe('준비 2개 건너뜀 · 입력값 3칸 직접 입력 · 값 연결 1개');
  });

  it('영어도 나온다', () => {
    expect(카드요약(케이스('A-1'), 재료([]), 'en')).toBe('All setup runs · Use saved value');
  });

  it('API · 모킹 · 모킹 끄기 · 대기', () => {
    expect(카드요약({ kind: 'api', method: 'POST', path: '/a', expectStatus: 201 }, undefined, 'ko')).toBe('POST /a → 201');
    expect(카드요약({ kind: 'mock', urlPattern: '**/m', status: 500, contentType: 'x', body: '' }, undefined, 'ko')).toBe('**/m → 500');
    expect(카드요약({ kind: 'unmock', urlPattern: '**/m' }, undefined, 'ko')).toBe('**/m');
    expect(카드요약({ kind: 'wait', ms: 1500 }, undefined, 'ko')).toBe('1.5초 기다림');
    expect(카드요약({ kind: 'wait', ms: 1500 }, undefined, 'en')).toBe('Wait 1.5s');
  });
});

describe('이미실행', () => {
  const 모음: 재료들 = new Map([['A-1', 재료(['로그인', '목록 열기'])], ['B-1', 재료(['결제'])], ['C-1', null]]);
  const 부품: ScenarioPart[] = [케이스('A-1'), { kind: 'wait', ms: 1 }, 케이스('B-1'), 케이스('A-1')];

  it('앞쪽 case 중 그 제목을 가진 첫 단계의 번호', () => {
    expect(이미실행(부품, 모음, 4, '로그인')).toBe(1);
    expect(이미실행(부품, 모음, 4, '결제')).toBe(3);
  });
  it('자기 번호와 뒤는 안 본다 · 없으면 null · 재료 없는 단계는 건너뛴다', () => {
    expect(이미실행(부품, 모음, 1, '로그인')).toBeNull();
    expect(이미실행(부품, 모음, 3, '결제')).toBeNull();
    expect(이미실행([케이스('C-1'), 케이스('A-1')], 모음, 2, '로그인')).toBeNull();
  });
});

describe('모킹구간', () => {
  it('켜기 자신은 자기 무늬를 안 가지고 다음 단계부터 걸린다', () => {
    const 부품: ScenarioPart[] = [
      { kind: 'mock', urlPattern: '**/a', status: 500, contentType: 'x', body: '' },
      케이스('A-1'),
      { kind: 'mock', urlPattern: '**/b', status: 500, contentType: 'x', body: '' },
      { kind: 'mock', urlPattern: '**/a', status: 404, contentType: 'x', body: '' },
      { kind: 'unmock', urlPattern: '**/a' },
      케이스('B-1'),
    ];
    expect(모킹구간(부품)).toEqual([[], ['**/a'], ['**/a'], ['**/a', '**/b'], ['**/a', '**/b'], ['**/b']]);
  });
  it('안 걸린 무늬를 끄면 그대로', () => {
    expect(모킹구간([{ kind: 'unmock', urlPattern: '**/z' }, 케이스('A-1')])).toEqual([[], []]);
  });
});

describe('팔레트차례', () => {
  const 줄 = (tcId: string, platforms: CaseRow['platforms'], techniques?: CaseRow['techniques']): CaseRow => ({
    tcId, name: tcId, platforms, precondition: [], filePath: '', paramSchema: {}, expectedSchema: {},
    isActive: true, scannedAt: '', ...(techniques === undefined ? {} : { techniques }),
  });
  const [경계, 동등, 결정, 상태] = TECHNIQUES;

  it('기법 낱말 자리가 바뀌면 이 검사가 먼저 깨진다', () => {
    expect(상태).toBe('상태 전이');
  });

  it('상태 전이 · 기법 없음 · 빈 기법은 흐름, 나머지는 입력값. 차례를 지킨다', () => {
    const r = 팔레트차례(
      [줄('A', ['desktop']), 줄('B', ['desktop'], [경계]), 줄('C', ['desktop'], []), 줄('D', ['desktop'], [동등, 결정]), 줄('E', ['desktop'], [경계, 상태])],
      'desktop',
    );
    expect(r.흐름.map((c) => c.tcId)).toEqual(['A', 'C', 'E']);
    expect(r.입력값.map((c) => c.tcId)).toEqual(['B', 'D']);
    expect(r.뺀수).toBe(0);
  });

  it('디바이스에 없는 케이스는 빼고 수만 센다', () => {
    const r = 팔레트차례([줄('A', ['desktop']), 줄('B', ['mobile']), 줄('C', ['desktop', 'mobile'])], 'mobile');
    expect(r.흐름.map((c) => c.tcId)).toEqual(['B', 'C']);
    expect(r.뺀수).toBe(1);
  });
});

describe('조립값', () => {
  const 칸 = (key: string, kind: Field['kind'], required: boolean): Field => ({
    key, label: key, kind, required, optional: !required, secret: false,
  });
  it('빈 글자 · 공백 칸은 필수여도 키를 뺀다', () => {
    const r = 조립값([칸('a', 'text', true), 칸('b', 'number', true), 칸('c', 'text', false)], { a: '', b: '  ', c: '' });
    expect(r).toEqual({});
  });
  it('남은 칸은 숫자 · 참거짓으로 바꾼다', () => {
    const r = 조립값(
      [칸('n', 'number', true), 칸('f', 'boolean', true), 칸('s', 'text', true), 칸('e', 'text', true)],
      { n: '12', f: 'true', s: 'hi', e: '' },
    );
    expect(r).toEqual({ n: 12, f: true, s: 'hi' });
  });
});

describe('순서바꾸기 · 빼기 · 가리킴빈곳', () => {
  const 만든다 = (): ScenarioPart[] => [
    케이스('A'),
    케이스('B', { links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/l', fromSeq: 1 }] }),
    케이스('C', { links: [{ kind: 'bind', param: 'p', value: 응답(1) }] }),
    케이스('D', {
      links: [{ kind: 'rewrite', method: 'POST', urlPattern: '**/w', to: { method: 'PUT', path: '/w/{}', value: 응답(3) } }],
    }),
  ];
  const 가리킴 = (p: ScenarioPart): number[] => {
    if (p.kind !== 'case') return [];
    return (p.links ?? []).map((l) =>
      l.kind === 'reuse' ? l.fromSeq : l.kind === 'bind' ? l.value.fromSeq : l.kind === 'rewrite' ? l.to.value.fromSeq : -1,
    );
  };

  it('순서바꾸기는 가리킴 셋을 새 번호로 매긴다 · 원본을 안 바꾼다', () => {
    const 원본 = 만든다();
    const 복사 = JSON.stringify(원본);
    const r = 순서바꾸기(원본, 1, 4);
    expect(JSON.stringify(원본)).toBe(복사);
    expect(r.map((p) => (p.kind === 'case' ? p.tcId : ''))).toEqual(['B', 'C', 'D', 'A']);
    expect(가리킴(r[0]!)).toEqual([4]);
    expect(가리킴(r[1]!)).toEqual([4]);
    expect(가리킴(r[2]!)).toEqual([2]);
  });
  it('순서바꾸기 — 뒤를 앞으로 당길 때 rewrite 가 따라간다', () => {
    const r = 순서바꾸기(만든다(), 3, 1);
    expect(r.map((p) => (p.kind === 'case' ? p.tcId : ''))).toEqual(['C', 'A', 'B', 'D']);
    expect(가리킴(r[3]!)).toEqual([1]);
    expect(가리킴(r[0]!)).toEqual([2]);
    expect(가리킴(r[2]!)).toEqual([2]);
  });
  it('같은 자리로 옮기면 그대로', () => {
    expect(순서바꾸기(만든다(), 2, 2)).toEqual(만든다());
  });

  it('빼기는 뒤 번호를 당기고 뺀 단계를 가리키던 것은 0 으로', () => {
    const r = 빼기(만든다(), 3);
    expect(r).toHaveLength(3);
    expect(가리킴(r[2]!)).toEqual([0]);
    expect(가리킴(r[1]!)).toEqual([1]);
    const 앞 = 빼기(만든다(), 1);
    expect(가리킴(앞[0]!)).toEqual([0]);
    expect(가리킴(앞[1]!)).toEqual([0]);
    expect(가리킴(앞[2]!)).toEqual([2]);
  });

  it('가리킴빈곳은 0 · 자기 이상 · case 가 아닌 단계를 가리키는 번호를 모은다', () => {
    const 부품: ScenarioPart[] = [
      케이스('A'),
      { kind: 'wait', ms: 1 },
      케이스('B', { links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/l', fromSeq: 2 }] }),
      케이스('C', { links: [{ kind: 'bind', param: 'p', value: 응답(0) }] }),
      케이스('D', { links: [{ kind: 'rewrite', method: 'POST', urlPattern: '**/w', to: { method: 'PUT', path: '/w/{}', value: 응답(5) } }] }),
      케이스('E', { links: [{ kind: 'bind', param: 'p', value: 응답(1) }, { kind: 'block', method: 'GET', urlPattern: '**/b' }] }),
    ];
    expect(가리킴빈곳(부품)).toEqual([3, 4, 5]);
    expect(가리킴빈곳(만든다())).toEqual([]);
  });
});

describe('넘겨받기끄기 · 케이스바꾸기', () => {
  it('끄면 건너뛰기와 값 연결을 비운다', () => {
    const p = 케이스('A', { skipSteps: ['x'], links: [{ kind: 'block', method: 'GET', urlPattern: '**/b' }], params: { a: 1 } });
    expect(넘겨받기끄기(p)).toEqual({ ...p, carryOver: false, skipSteps: [], links: [] });
  });
  it('케이스를 바꾸면 건너뛰기 · 입력값을 비우고 넘겨받기 · 값 연결은 남긴다', () => {
    const links: CasePart['links'] = [{ kind: 'block', method: 'GET', urlPattern: '**/b' }];
    const p = 케이스('A', { skipSteps: ['x'], params: { a: 1 }, expected: { b: 2 }, carryOver: false, links });
    expect(케이스바꾸기(p, 'Z')).toEqual({ kind: 'case', tcId: 'Z', params: {}, expected: {}, skipSteps: [], carryOver: false, links });
  });
});
