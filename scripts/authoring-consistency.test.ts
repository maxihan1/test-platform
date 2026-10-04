// 작성 결과 일관성 검사 — 같은 기획서로 여러 번 작성한 결과가 얼마나 같은지 재는 숫자
import { describe, expect, it } from 'vitest';

import { 실행요약, 확인문장들 } from './authoring-consistency.js';

const 케이스 = (tcId: string, ...문장: string[]) =>
  `import { defineCase, test, verify } from '@platform/kit';\nexport const spec = defineCase({ tcId: '${tcId}', name: 'n', precondition: [], params: null, expected: null });\n` +
  문장.map((s) => `await verify('${s}', 1, 1);`).join('\n');

const 표 = (...줄: [string, string][]) =>
  ['## 요구사항', '', '| 요구 | 출처 | tcId |', '|---|---|---|', ...줄.map(([출처, tcId], i) => `| ${String(i + 1)} | ${출처} | ${tcId} |`), '', '## 제외', ''].join('\n');

describe('확인 문장 뽑기 (8·9번 측정 · 2026-10-04)', () => {
  it('verify 의 첫 인자 문자열을 차례대로 뽑고 빈칸은 하나로 모은다', () => {
    const 글 = [
      "await verify('로고가 보인다', a, true);",
      'await verify(\n      "목록에   두 건이\n 보인다",\n      [x],\n      [y],\n    );',
      "await verify(변수, 1, 1);",
      'await verify(`금액은 ${n}원`, 1, 1);',
    ].join('\n');
    expect(확인문장들(글)).toEqual(['로고가 보인다', '목록에 두 건이 보인다']);
  });

  it('작은따옴표 안의 이스케이프된 따옴표에서 끊기지 않는다', () => {
    expect(확인문장들("verify('「It\\'s」가 보인다', 1, 1)")).toEqual(["「It's」가 보인다"]);
  });
});

describe('실행 하나 요약', () => {
  const 파일들 = [
    { 경로: 'MKT-FN-001.spec.ts', 글: 케이스('MKT-FN-001', 'a', 'b') },
    { 경로: 'MKT-FN-002.spec.ts', 글: 케이스('MKT-FN-002', 'c') },
    { 경로: 'pages/home.page.ts', 글: '' },
    { 경로: 'mkt/components/home.page.ts', 글: '' },
    { 경로: 'helpers/x.ts', 글: "export const spec = 1; verify('d', 1, 1)" },
  ];

  it('케이스 파일마다 tcId → 확인 문장을 모으고, 화면 파일은 pages · components 마디부터의 경로로 센다', () => {
    const 요약 = 실행요약(파일들);
    expect([...요약.케이스]).toEqual([
      ['MKT-FN-001', new Set(['a', 'b'])],
      ['MKT-FN-002', new Set(['c'])],
    ]);
    expect(요약.화면파일).toEqual(new Set(['pages/home.page.ts', 'components/home.page.ts']));
    expect(요약.덮음).toBeNull();
  });

  it('표가 있으면 tcId → 덮은 원장 번호를 모은다 — R15 로 같은 tcId 를 가리킨 줄은 합치고, 백틱은 벗기고, 파일 없는 tcId 는 뺀다', () => {
    const 요약 = 실행요약(
      파일들,
      표(['기획.docx §1 REQ-HOME-001', 'MKT-FN-001'], ['기획.docx §1 REQ-HOME-002 · REQ-HOME-003', '`MKT-FN-001`'], ['REQ-HOME-004', 'MKT-FN-009'], ['화면 `/`', 'MKT-FN-002']),
    );
    expect(요약.덮음).toEqual(new Map([['MKT-FN-001', new Set(['REQ-HOME-001', 'REQ-HOME-002', 'REQ-HOME-003'])]]));
  });

  it('표는 있는데 출처에 원장 번호가 하나도 없으면 빈 Map 이다(원장 없음 — 표 없음과 다르다)', () => {
    expect(실행요약(파일들, 표(['화면 기록 home.md', 'MKT-FN-001'])).덮음).toEqual(new Map());
  });
});
