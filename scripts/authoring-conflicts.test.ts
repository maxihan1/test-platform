// 반영 때 겹침 찾기 — 동시에 작성한 요청이 같은 tc_id · 같은 요구 번호 · 같은 이름을 들고 오는지 (작성 §3.6 「★ 반영 때 겹침 검사」)
import { describe, expect, it } from 'vitest';

import { 겹침찾기, 이름틀, 케이스이름, 표tcId들 } from './authoring-conflicts.js';

function 케이스(tcId: string, 이름: string): string {
  return `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: '${tcId}',
  name: '${이름}',
  platforms: ['desktop'],
});

test(spec, async ({ page, step }) => {
  await step('${tcId} 화면을 연다', async () => {
    await page.goto('/');
  });
  verify('화면이 열린다', true);
});
`;
}

function 표(줄들: [string, string, string][]): string {
  return [
    '# PAY — 결제 요구사항 표',
    '',
    '## 요구사항',
    '',
    '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |',
    '|------|----|------|------|------|------|------|----------|',
    ...줄들.map(([번호, 출처, tcId]) => `| ${번호} | 정상 | 전제 | 조작 | 결과 | ${출처} | ${tcId} | 2026-10-01 |`),
    '',
  ].join('\n');
}

const 경로 = (tcId: string) => `tests/pay/${tcId}.spec.ts`;
const 표경로 = 'docs/cases/PAY.md';

describe('케이스 이름 · 표의 tc_id', () => {
  it('이름은 코드를 실행하지 않고 구문 트리에서 읽는다', () => {
    expect(케이스이름(케이스('PAY-001', '쿠폰을 쓰면 금액이 준다'))).toBe('쿠폰을 쓰면 금액이 준다');
    expect(케이스이름('export const x = 1;')).toBeNull();
  });

  it('이름은 앞뒤 공백 · 겹친 빈칸 · 영문 대소문자를 무시하고 견준다', () => {
    expect(이름틀('  Login  화면이   열린다 ')).toBe(이름틀('login 화면이 열린다'));
  });

  it('표의 tc_id 는 「제거함(…)」 칸까지 센다 — 지운 번호를 다시 쓰면 옛 실행 이력이 붙는다', () => {
    const 글 = 표([['1', '9 REQ-PAY-001', 'PAY-001'], ['2', '9 REQ-PAY-002', '제거함(PAY-002)']]);
    expect([...표tcId들(글)].sort()).toEqual(['PAY-001', 'PAY-002']);
  });
});

describe('겹침 찾기', () => {
  const 바탕 = {
    표경로,
    뺀것: new Set<string>(),
  };

  it('⒜ 이 요청이 더한 tc_id 가 main 에 있으면 겹침이다 — 경로가 달라도', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 경로('PAY-031'), 글: 케이스('PAY-031', '쿠폰 적용') }],
      main케이스: [{ file: 'tests/pay/sub/PAY-031.spec.ts', 글: 케이스('PAY-031', '장바구니 비우기') }],
      새로들어온: new Set(['tests/pay/sub/PAY-031.spec.ts']),
      요청표: 표([['1', '9 REQ-PAY-004', 'PAY-031']]),
      main표: 표([['1', '7 REQ-PAY-010', 'PAY-031']]),
    });
    expect(결과).toEqual([
      {
        tcId: 'PAY-031',
        name: '쿠폰 적용',
        file: 경로('PAY-031'),
        kinds: ['TCID'],
        with: [{ tcId: 'PAY-031', name: '장바구니 비우기', file: 'tests/pay/sub/PAY-031.spec.ts' }],
      },
    ]);
  });

  it('⒜ main 표에 「제거함」으로만 남은 번호도 겹침이다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 경로('PAY-031'), 글: 케이스('PAY-031', '쿠폰 적용') }],
      main케이스: [],
      새로들어온: new Set(),
      요청표: 표([['1', '9 REQ-PAY-004', 'PAY-031']]),
      main표: 표([['1', '7 REQ-PAY-010', '제거함(PAY-031)']]),
    });
    expect(결과.map((c) => c.kinds)).toEqual([['TCID']]);
    expect(결과[0]!.with).toEqual([{ tcId: 'PAY-031', name: '', file: 표경로 }]);
  });

  it('⒝ 작성을 시작한 뒤 main 에 들어온 케이스와 같은 요구 번호면 겹침이다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 경로('PAY-032'), 글: 케이스('PAY-032', '쿠폰 두 장') }],
      main케이스: [{ file: 경로('PAY-040'), 글: 케이스('PAY-040', '쿠폰 겹쳐 쓰기') }],
      새로들어온: new Set([경로('PAY-040')]),
      요청표: 표([['1', '9 §2 REQ-PAY-004', 'PAY-032']]),
      main표: 표([['1', '12 §3 REQ-PAY-004', 'PAY-040']]),
    });
    expect(결과).toEqual([
      {
        tcId: 'PAY-032',
        name: '쿠폰 두 장',
        file: 경로('PAY-032'),
        kinds: ['REQUIREMENT'],
        with: [{ tcId: 'PAY-040', name: '쿠폰 겹쳐 쓰기', file: 경로('PAY-040') }],
        requirements: ['REQ-PAY-004'],
      },
    ]);
  });

  it('⒝ 그 전부터 있던 케이스와 같은 번호는 겹침이 아니다 — 한 요구에 케이스 여럿은 원래 된다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 경로('PAY-032'), 글: 케이스('PAY-032', '쿠폰 두 장') }],
      main케이스: [{ file: 경로('PAY-010'), 글: 케이스('PAY-010', '쿠폰 한 장') }],
      새로들어온: new Set(),
      요청표: 표([['1', '9 REQ-PAY-004', 'PAY-032']]),
      main표: 표([['1', '9 REQ-PAY-004', 'PAY-010']]),
    });
    expect(결과).toEqual([]);
  });

  it('⒝ 문단 번호(P-001 · P2-003)는 요청마다 1부터라 세지 않는다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 경로('PAY-032'), 글: 케이스('PAY-032', '쿠폰 두 장') }],
      main케이스: [{ file: 경로('PAY-040'), 글: 케이스('PAY-040', '배송지 바꾸기') }],
      새로들어온: new Set([경로('PAY-040')]),
      요청표: 표([['1', '9 P-001 · P2-003', 'PAY-032']]),
      main표: 표([['1', '12 P-001 · P2-003', 'PAY-040']]),
    });
    expect(결과).toEqual([]);
  });

  it('⒞ 작성을 시작한 뒤 들어온 케이스와 이름이 같으면 겹침이다 · 예전 케이스와 같은 이름은 아니다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [
        { file: 경로('PAY-032'), 글: 케이스('PAY-032', 'Login 화면이 열린다') },
        { file: 경로('PAY-033'), 글: 케이스('PAY-033', '예전 이름') },
      ],
      main케이스: [
        { file: 경로('PAY-040'), 글: 케이스('PAY-040', 'login  화면이 열린다') },
        { file: 경로('PAY-005'), 글: 케이스('PAY-005', '예전 이름') },
      ],
      새로들어온: new Set([경로('PAY-040')]),
      요청표: '',
      main표: '',
    });
    expect(결과.map((c) => [c.tcId, c.kinds])).toEqual([['PAY-032', ['NAME']]]);
  });

  it('한 케이스에 여러 종류가 걸리면 모아서 한 줄로 낸다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 경로('PAY-040'), 글: 케이스('PAY-040', '쿠폰 겹쳐 쓰기') }],
      main케이스: [{ file: 경로('PAY-040'), 글: 케이스('PAY-040', '쿠폰 겹쳐 쓰기') }],
      새로들어온: new Set([경로('PAY-040')]),
      요청표: 표([['1', '9 REQ-PAY-004', 'PAY-040']]),
      main표: 표([['1', '9 REQ-PAY-004', 'PAY-040']]),
    });
    expect(결과).toHaveLength(1);
    expect(결과[0]!.kinds).toEqual(['TCID', 'REQUIREMENT', 'NAME']);
    expect(결과[0]!.with).toEqual([{ tcId: 'PAY-040', name: '쿠폰 겹쳐 쓰기', file: 경로('PAY-040') }]);
  });

  it('보류에서 제거한 케이스는 겹침으로 세지 않는다 — 어차피 반영에서 빠진다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      뺀것: new Set(['PAY-031']),
      더한: [{ file: 경로('PAY-031'), 글: 케이스('PAY-031', '쿠폰 적용') }],
      main케이스: [{ file: 경로('PAY-031'), 글: 케이스('PAY-031', '장바구니 비우기') }],
      새로들어온: new Set([경로('PAY-031')]),
      요청표: '',
      main표: '',
    });
    expect(결과).toEqual([]);
  });

  it('tc_id 를 못 읽은 파일은 건너뛴다 · 이름이 없으면 빈 글자다', () => {
    const 결과 = 겹침찾기({
      ...바탕,
      더한: [{ file: 'tests/pay/helper.spec.ts', 글: 'export const x = 1;' }],
      main케이스: [],
      새로들어온: new Set(),
      요청표: '',
      main표: '',
    });
    expect(결과).toEqual([]);
  });
});
