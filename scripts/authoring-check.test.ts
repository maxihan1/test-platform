// 빠른 검사 명령 검사 — 케이스 문장 읽기 · 케이스와 요구 목록 맞춰 보기 · 비밀번호 자리 (작성 §3.6 「빠른 검사 명령」)
import { describe, expect, it } from 'vitest';

import { type 케이스문장, 맞춰보기, 비밀자리들, 실행, 케이스문장읽기 } from './authoring-check.js';

const 케이스글 = `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({
  tcId: 'MKT-FN-105',
  name: '4번 틀리면 안내가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원이 있다', '로그인 화면이 열려 있다'],
  params: null,
  expected: null,
});
test(spec, async ({ page }) => {
  await test.step('새 회원을 만든다', async () => {});
  await test.step('비밀번호를 4번 틀린다', async () => {
    await verify('4번 틀리면 안내가 보인다', await page.title(), 'x');
  });
  await test.step(\`템플릿 \${1} 제목\`, async () => {});
});
`;

describe('케이스문장읽기', () => {
  it('defineCase 의 tcId · name · precondition 과 test.step 제목 · verify 첫 인자를 읽는다 — 글자가 아닌 제목은 빠진다', () => {
    expect(케이스문장읽기(케이스글)).toEqual({
      tcId: 'MKT-FN-105',
      name: '4번 틀리면 안내가 보인다',
      전제: ['새로 가입한 회원이 있다', '로그인 화면이 열려 있다'],
      절차: ['새 회원을 만든다', '비밀번호를 4번 틀린다'],
      판정: ['4번 틀리면 안내가 보인다'],
    });
  });

  it('defineCase 가 없으면 null', () => {
    expect(케이스문장읽기('export const 화면 = 1;')).toBeNull();
  });
});

const 머리 = '## 요구사항\n\n| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|---|---|---|---|---|---|---|---|\n';
const 줄 = (n: number, 전제: string, 조작: string, 결과: string, tcId: string) => `| ${n} | 정상 | ${전제} | ${조작} | ${결과} | R-${n} | ${tcId} | 2026-10-19 |\n`;
const 케이스 = (덧: Partial<케이스문장> & { tcId: string }): 케이스문장 => ({ name: null, 전제: [], 절차: [], 판정: [], ...덧 });

describe('맞춰보기 — 관문 2 (6-gates.md 「관문 2」)', () => {
  it('전제 · 조작 · 결과가 다 있고 혼자 쓰는 tcId 의 name 이 결과와 같으면 어긋남 없음', () => {
    const 표 = 머리 + 줄(1, '회원이다', '연다', 'A 가 보인다', 'T-1');
    expect(맞춰보기(표, [케이스({ tcId: 'T-1', name: 'A 가 보인다', 전제: ['회원이다'], 절차: ['준비', '연다'], 판정: ['준비됐다', 'A 가 보인다'] })])).toEqual([]);
  });

  it('칸마다 없는 문장을 짚는다 · 혼자 쓰는 tcId 는 name 도 본다', () => {
    const 표 = 머리 + 줄(7, '회원이다', '연다', 'A 가 보인다', 'T-1');
    expect(맞춰보기(표, [케이스({ tcId: 'T-1', name: '다른 이름', 전제: ['비회원이다'], 절차: ['열기'], 판정: ['A 가 보임'] })])).toEqual([
      'T-1 (목록 7번째 줄) 전제 「회원이다」 — precondition 에 없다',
      'T-1 (목록 7번째 줄) 조작 「연다」 — test.step 제목에 없다',
      'T-1 (목록 7번째 줄) 결과 「A 가 보인다」 — verify 문장에 없다',
      'T-1 (목록 7번째 줄) name 「다른 이름」 — 결과와 다르다',
    ]);
  });

  it('합친 케이스(R15)의 name 은 결과와 견주지 않고, 결과 칸은 둘 다 verify 에 있어야 한다', () => {
    const 표 = 머리 + 줄(1, '회원이다', '연다', 'A 가 보인다', 'T-1') + 줄(2, '회원이다', '닫는다', 'B 가 사라진다', 'T-1');
    const c = 케이스({ tcId: 'T-1', name: '열고 닫으면 A 가 보이고 B 가 사라진다', 전제: ['회원이다'], 절차: ['연다', '닫는다'], 판정: ['A 가 보인다'] });
    expect(맞춰보기(표, [c])).toEqual(['T-1 (목록 2번째 줄) 결과 「B 가 사라진다」 — verify 문장에 없다']);
  });

  it('결과 문장 · 합친 이름이 다른 케이스와 겹치면 짚는다', () => {
    const 표 = 머리 + 줄(1, '', '연다', 'A 가 보인다', 'T-1') + 줄(2, '', '연다', 'A 가 보인다', 'T-2') + 줄(3, '', '닫는다', 'C', 'T-3') + 줄(4, '', '연다', 'D', 'T-3');
    const 틀림 = 맞춰보기(표, [
      케이스({ tcId: 'T-1', name: 'A 가 보인다', 절차: ['연다'], 판정: ['A 가 보인다'] }),
      케이스({ tcId: 'T-2', name: 'A 가 보인다', 절차: ['연다'], 판정: ['A 가 보인다'] }),
      케이스({ tcId: 'T-3', name: 'A 가 보인다', 절차: ['닫는다', '연다'], 판정: ['C', 'D'] }),
    ]);
    expect(틀림).toEqual(['결과 문장이 겹친다 「A 가 보인다」 — T-1 · T-2 · T-3']);
  });

  it('케이스 파일이 없는 tcId(제외 · 제거함)는 건너뛰고, 볼 tcId 를 주면 그것만 본다 · 칸 안의 \\| 는 | 로 읽는다', () => {
    const 표 = 머리 + 줄(1, '', '연다', 'A \\| B', 'T-1') + 줄(2, '', '연다', 'X', 'T-2') + 줄(3, '', '연다', 'Y', '제거함(T-9)');
    const 케이스들 = [케이스({ tcId: 'T-1', name: 'A | B', 절차: ['연다'], 판정: ['A | B'] }), 케이스({ tcId: 'T-2', name: '틀림', 절차: ['연다'], 판정: ['X'] })];
    expect(맞춰보기(표, 케이스들, new Set(['T-1']))).toEqual([]);
    expect(맞춰보기(표, 케이스들)).toEqual(['T-2 (목록 2번째 줄) name 「틀림」 — 결과와 다르다']);
  });
});

describe('비밀자리들 — 값은 안 돌려주고 파일:줄만', () => {
  it('원문 · JSON 이스케이프 꼴을 줄마다, .json 은 푼 값에서도 찾는다 · 빈 비밀번호는 안 본다', () => {
    const 파일들 = [
      { 경로: 'tests/a.spec.ts', 글: "한 줄\nfill('pa\"ss')\n셋째" },
      { 경로: 'out/diffs.json', 글: '{"글":"pa\\"ss"}' },
      { 경로: 'docs/b.md', 글: '역할 비밀번호 role-pw 가 있다' },
      { 경로: 'docs/c.md', 글: '깨끗' },
    ];
    expect(비밀자리들(파일들, ['pa"ss', 'role-pw', ''])).toEqual(['tests/a.spec.ts:2', 'out/diffs.json:1', 'out/diffs.json (푼 값)', 'docs/b.md:1']);
    expect(비밀자리들(파일들, [''])).toEqual([]);
  });
});

describe('실행 — 잘못 부르면 2', () => {
  it('모드가 틀리거나 인자가 모자라면 아무것도 안 돌린다', async () => {
    expect(await 실행(['다시'], '/없는곳', {})).toBe(2);
    expect(await 실행(['마지막', 'ledger.json', 'MKT'], '/없는곳', {})).toBe(2);
    expect(await 실행(['보조'], '/없는곳', {})).toBe(2);
  });
});
