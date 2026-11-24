// 프로시저 파일을 케이스마다 읽는 검사 — 조각 · 원장 대조 재료 · 맞춰 보기 · 끝내기 케이스 목록 · 게임 형식 (작성 §3.6 「★ 테스트 프로시저 작성」 「관문」)
import { describe, expect, it } from 'vitest';

import { 구간, 선언, 절차, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import { 맞춰보기, 케이스문장들읽기 } from './authoring-check.js';
import { 게임형식, 스모크틀림 } from './authoring-check-game.js';
import { 케이스목록만들기 } from './authoring-cases.js';
import { tcId들 } from './authoring-ledger-check.js';
import { tcId별글 } from './authoring-ledger-verdict.js';
import { 케이스조각들, 프로시저값읽기 } from './authoring-proc-pieces.js';

// 글쓰기 흐름 — 본문없음 → 글자수초과 → 게시확인. 사이 준비 절차의 확인은 어느 케이스의 결과도 아니다
const 본문 =
  절차('글쓰기 화면을 연다', ` await verify('글쓰기 화면이 보인다', true, true); `) +
  구간('본문없음', '본문을 비운다', ` await verify('게시 버튼이 꺼진다', true, true); `) +
  구간('글자수초과', '본문에 501자를 넣는다', ` await verify('글자 수 초과 안내가 보인다', true, true); `) +
  절차('본문을 고친다', ` await verify('게시 버튼이 켜진다', true, true); `) +
  구간('게시확인', '게시를 누른다', ` await verify('타임라인에 글이 보인다', true, true); `);
const 선언들 =
  선언('본문없음', 'XQ-FN-101', `\n  techniques: ['경계값 분석'],`) + 선언('글자수초과', 'XQ-FN-102') + 선언('게시확인', 'XQ-FN-103');
const 글 = 프로시저글(본문, { 선언들 });
const 옛꼴 = `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: 'XQ-FN-201', name: '옛 꼴', platforms: ['android'], precondition: [], params: null, expected: null });
test(spec, async () => { await verify('옛 확인', true, true); });
`;

describe('케이스조각들 — 프로시저 파일은 케이스마다 한 조각', () => {
  it('cases 차례대로 케이스마다 조각이 나오고 구간글은 그 케이스 구간의 확인만 든다', () => {
    const 조각 = 케이스조각들(글);
    expect(조각.map((c) => c.tcId)).toEqual(['XQ-FN-101', 'XQ-FN-102', 'XQ-FN-103']);
    expect(조각[2]!.프로시저).toMatchObject({ procId: 'XQ-TP-001', 전제: ['일반 회원으로 로그인해 있다'] });
    expect(조각[2]!.글).toContain('게시 버튼이 켜진다');
    expect(조각[2]!.프로시저!.구간글).not.toContain('게시 버튼이 켜진다');
    expect(조각[2]!.프로시저!.구간글).toContain('타임라인에 글이 보인다');
  });

  it('옛 꼴 파일은 조각 하나 · 프로시저가 아니면 프로시저값읽기는 null', () => {
    expect(케이스조각들(옛꼴)).toEqual([{ tcId: 'XQ-FN-201', 글: 옛꼴 }]);
    expect(프로시저값읽기(옛꼴)).toBeNull();
  });

  it('let 으로 선언한 케이스는 스캐너처럼 안 센다', () => {
    const 렛 = 프로시저글(본문, { 선언들: 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102') + 선언('게시확인', 'XQ-FN-103').replace('const 게시확인', 'let 게시확인') });
    expect(케이스조각들(렛).map((c) => c.tcId)).toEqual(['XQ-FN-101', 'XQ-FN-102']);
  });

  it('구간을 못 가른 파일은 맞춰 볼 문장을 안 낸다 — 형식 검사가 원인을 짚는다', () => {
    const 깨진 = 프로시저글(본문, { cases: '[본문없음, 글자수초과, 게시확인, 없는것]' });
    expect(케이스조각들(깨진).every((c) => c.프로시저?.갈림 === false)).toBe(true);
    expect(케이스문장들읽기(깨진)).toEqual([]);
  });

  it('원장 대조 재료 — 프로시저 파일의 케이스를 다 세고, 기법은 그 케이스 선언에서 읽는다', () => {
    expect([...tcId들([글, 옛꼴])].sort()).toEqual(['XQ-FN-101', 'XQ-FN-102', 'XQ-FN-103', 'XQ-FN-201']);
    const 표 = tcId별글([글]);
    expect(표.get('XQ-FN-101')).toContain("techniques: ['경계값 분석']");
    expect(표.get('XQ-FN-102')).not.toContain('techniques');
  });
});

describe('맞춰보기 — 프로시저 안 케이스 (관문 2)', () => {
  const 표 = (결과: string, tcId: string, 전제 = '', 조작 = '') => `| 1 | ${전제} | ${조작} | ${결과} | ${tcId} |`;
  const 머리 = ['## 요구사항', '', '| 요구 | 전제 | 조작 | 결과 | tcId |', '|---|---|---|---|---|'];

  it('전제는 프로시저 precondition 에서도, 조작은 준비 구간에서도 찾고 결과는 그 케이스 구간에서만 찾는다', () => {
    const 케이스들 = 케이스문장들읽기(글);
    const 맞음 = [...머리, 표('타임라인에 글이 보인다', 'XQ-FN-103', '일반 회원으로 로그인해 있다', '본문을 고친다')].join('\n');
    expect(맞춰보기(맞음, 케이스들).filter((l) => !l.includes('name'))).toEqual([]);
    const 준비확인 = [...머리, 표('게시 버튼이 켜진다', 'XQ-FN-103')].join('\n');
    expect(맞춰보기(준비확인, 케이스들).some((l) => l.includes('게시 버튼이 켜진다') && l.includes('test.case 구간'))).toBe(true);
  });

  it('앞 케이스의 결과가 뒤 케이스의 준비 판정이어도 같은 프로시저면 짚지 않고, 다른 파일이면 짚는다', () => {
    // 본문없음의 결과를 글자수초과의 준비 구간이 다시 확인한다
    const 이어진 = 프로시저글(구간('본문없음', '비운다', ` await verify('게시 버튼이 꺼진다', true, true); `) + 절차('준비', ` await verify('게시 버튼이 꺼진다', true, true); `) + 구간('글자수초과', '넘긴다', ` await verify('초과 안내', true, true); `) + 구간('게시확인', '누른다', ` await verify('끝', true, true); `));
    const 줄 = [...머리, 표('게시 버튼이 꺼진다', 'XQ-FN-101')].join('\n');
    expect(맞춰보기(줄, 케이스문장들읽기(이어진)).filter((l) => l.includes('준비 판정'))).toEqual([]);
    const 남의파일 = `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: 'XQ-FN-301', name: '남', platforms: ['android'], precondition: [], params: null, expected: null });
test(spec, async () => { await test.step('준비', async () => { await verify('게시 버튼이 꺼진다', true, true); }); await verify('남 결과', true, true); });
`;
    expect(맞춰보기(줄, [...케이스문장들읽기(이어진), ...케이스문장들읽기(남의파일)]).some((l) => l.includes('준비 판정') && l.includes('XQ-FN-301'))).toBe(true);
    // 결과 주인이 둘 — 같은 프로시저의 XQ-FN-101 과 남의 파일의 XQ-FN-401. 준비하는 XQ-FN-102 와 401 의 어긋남은 남는다
    const 남의결과 = `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: 'XQ-FN-401', name: '남', platforms: ['android'], precondition: [], params: null, expected: null });
test(spec, async () => { await verify('게시 버튼이 꺼진다', true, true); });
`;
    const 둘 = [...머리, 표('게시 버튼이 꺼진다', 'XQ-FN-101'), 표('게시 버튼이 꺼진다', 'XQ-FN-401')].join('\n');
    expect(맞춰보기(둘, [...케이스문장들읽기(이어진), ...케이스문장들읽기(남의결과)])).toContain('결과 문장이 다른 케이스의 준비 판정이다 「게시 버튼이 꺼진다」 — 결과 XQ-FN-401 · 준비 XQ-FN-102 — 결과 쪽을 고친다');
  });
});

describe('케이스목록만들기 — 프로시저 파일은 케이스마다 그 구간의 확인 문장', () => {
  it('바뀐 프로시저 파일의 케이스가 모두 실리고 file 이 같다', () => {
    const file = 'tests/xq/XQ-TP-001.spec.ts';
    const 목록값 = 케이스목록만들기(
      ['XQ-FN-101', 'XQ-FN-102', 'XQ-FN-103'].map((tcId) => ({ tcId, name: tcId, filePath: 'xq/XQ-TP-001.spec.ts' })),
      { 바뀜: new Map([[file, 'NEW']]), 표글: '', 접두사: 'XQ', 읽기: () => 글 },
    );
    expect(목록값.map((c) => [c.tcId, c.file, c.verifies])).toEqual([
      ['XQ-FN-101', file, ['게시 버튼이 꺼진다']],
      ['XQ-FN-102', file, ['글자 수 초과 안내가 보인다']],
      ['XQ-FN-103', file, ['타임라인에 글이 보인다']],
    ]);
  });
});

describe('게임형식 · 스모크 — 프로시저 파일은 케이스 선언마다', () => {
  it('둘째 케이스의 요소가 지도에 없으면 짚고, 스모크는 케이스마다 센다', () => {
    const 게임글 = 프로시저글(본문, {
      선언들: 선언('본문없음', 'XQ-FN-101', `\n  elements: ['UI:Login'],\n  smoke: true,`) + 선언('글자수초과', 'XQ-FN-102', `\n  elements: ['UI:Nope'],\n  smoke: true,`) + 선언('게시확인', 'XQ-FN-103', `\n  elements: [],`),
    });
    expect(게임형식([{ 경로: 'tests/xq/XQ-TP-001.spec.ts', 글: 게임글 }], new Set(['UI:Login']))).toEqual([
      'tests/xq/XQ-TP-001.spec.ts — 요소 UI:Nope 가 게임 지도에 없다. game-elements.json 에 먼저 적거나 game-map.txt 의 열쇠를 쓴다',
    ]);
    expect(스모크틀림('xq', [게임글]).수).toBe(2);
  });
});
