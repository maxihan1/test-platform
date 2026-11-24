// 보류 반영 3회 실행 판정 검사 — 프로시저 파일은 채운 케이스 판정만, 옛 꼴은 아무 실패나
import { describe, expect, it } from 'vitest';

import { 구간, 선언, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import { 세번판정, 실행대상들 } from './authoring-held-run.js';

const 파일 = 'tests/xq/XQ-TP-001.spec.ts';
const 판첨부 = (케이스: Record<string, unknown>[]) =>
  케이스.map((판) => ({ name: 'platform-case', contentType: 'application/json', body: Buffer.from(JSON.stringify(판)).toString('base64') }));

// repeat-each 회차는 시험 항목마다 하나로 온다고 본다 — 실제 보고가 spec 으로 가르는 경우도 같이 읽는다
const 회차 = (판들: Record<string, unknown>[], status = 'passed') => ({ projectName: 'desktop', status, results: [{ status, attachments: 판첨부(판들) }] });
const 보고 = (회차들: unknown[], 파일들 = ['xq/XQ-TP-001.spec.ts']) =>
  `잡음\n${JSON.stringify({ suites: 파일들.map((f) => ({ file: f, specs: [{ file: f, tests: 회차들 }] })) })}`;
const 대상 = [{ 파일, tcIds: ['XQ-FN-102'] }];
const 초록 = { tcId: 'XQ-FN-102', status: 'PASS' };
const 다른빨강 = { tcId: 'XQ-FN-103', status: 'FAIL', error: { message: '검증 실패: 다른 케이스' } };

describe('세번판정 — 프로시저 파일은 채운 케이스만 본다', () => {
  it('채운 케이스가 세 회차 다 초록이면 통과한다', () => {
    expect(세번판정(보고([회차([초록]), 회차([초록]), 회차([초록])]), 대상)).toEqual([]);
  });

  it('같은 프로시저의 다른 케이스가 빨간 것은 막지 않는다', () => {
    expect(세번판정(보고([회차([초록, 다른빨강], 'failed'), 회차([초록, 다른빨강], 'failed'), 회차([초록, 다른빨강], 'failed')]), 대상)).toEqual([]);
  });

  it('채운 케이스가 빨강이면 그 오류 첫 줄로 실패한다', () => {
    const 빨강 = { tcId: 'XQ-FN-102', status: 'FAIL', error: { message: '검증 실패: 안내가 안 보인다\n자세히' } };
    expect(세번판정(보고([회차([초록]), 회차([빨강], 'failed'), 회차([초록])]), 대상)).toEqual([`${파일} XQ-FN-102 — 검증 실패: 안내가 안 보인다`]);
  });

  it('앞 케이스에 막혔으면 통과가 아니다', () => {
    const 막힘 = { tcId: 'XQ-FN-102', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'XQ-FN-101' };
    expect(세번판정(보고([회차([막힘], 'failed')]), 대상)).toEqual([`${파일} XQ-FN-102 — 앞 케이스(XQ-FN-101)에 막혔다`]);
  });

  it('판정 첨부가 없으면 실패한다', () => {
    expect(세번판정(보고([회차([다른빨강], 'failed')]), 대상)).toEqual([`${파일} XQ-FN-102 — 판정을 못 읽었다`]);
  });

  it('그 파일을 돈 회차가 하나도 없으면 실패한다', () => {
    expect(세번판정(보고([회차([초록])], ['xq/다른.spec.ts']), 대상)).toEqual([`${파일} XQ-FN-102 — 돈 회차가 없다`]);
  });

  it('채운 케이스가 둘이면 케이스마다 낸다', () => {
    const 둘 = [{ 파일, tcIds: ['XQ-FN-102', 'XQ-FN-103'] }];
    expect(세번판정(보고([회차([초록, 다른빨강], 'failed')]), 둘)).toEqual([`${파일} XQ-FN-103 — 검증 실패: 다른 케이스`]);
  });

  it('보고를 못 읽으면 null — 부른 쪽이 종료 코드로 본다', () => {
    expect(세번판정('JSON 아님', 대상)).toBeNull();
  });
});

describe('세번판정 — 옛 꼴 파일은 아무 실패나 막는다', () => {
  const 옛 = { 파일: 'tests/xq/XQ-FN-201.spec.ts', tcIds: null };
  const 옛보고 = (status: string) => `${JSON.stringify({ suites: [{ file: 'xq/XQ-FN-201.spec.ts', specs: [{ file: 'xq/XQ-FN-201.spec.ts', tests: [{ results: [{ status, error: { message: '검증 실패: 최종 금액' } }] }] }] }] })}`;

  it('실패가 있으면 <파일> — <문장> 으로 낸다', () => {
    expect(세번판정(옛보고('failed'), [옛])).toEqual(['xq/XQ-FN-201.spec.ts — 최종 금액']);
    expect(세번판정(옛보고('passed'), [옛])).toEqual([]);
  });
});

describe('실행대상들 — 채운 파일마다', () => {
  it('프로시저 파일은 이번에 채운 케이스만, 옛 꼴은 null, spec 이 아닌 파일은 뺀다', () => {
    const 프로 = 프로시저글(구간('본문없음', 'a') + 구간('글자수초과', 'b'), { 선언들: 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102'), cases: '[본문없음, 글자수초과]' });
    const 옛 = `import { defineCase } from '@platform/kit';\nexport const spec = defineCase({ tcId: 'XQ-FN-201' });\n`;
    const 글들 = new Map([
      ['tests/xq/XQ-TP-001.spec.ts', 프로],
      ['tests/xq/XQ-FN-201.spec.ts', 옛],
      ['docs/cases/XQ.md', '표'],
    ]);
    expect(실행대상들(글들, { 'XQ-FN-102': { params: {} }, 'XQ-FN-201': { params: {} }, 'XQ-FN-101': { removed: true } })).toEqual([
      { 파일: 'tests/xq/XQ-TP-001.spec.ts', tcIds: ['XQ-FN-102'] },
      { 파일: 'tests/xq/XQ-FN-201.spec.ts', tcIds: null },
    ]);
  });

  it('제거만 한 프로시저 파일은 돌리지 않는다 — 걷은 구간은 건너뛰던 것이라 흐름이 같다', () => {
    const 프로 = 프로시저글(구간('글자수초과', 'b'), { 선언들: 선언('글자수초과', 'XQ-FN-102'), cases: '[글자수초과]' });
    expect(실행대상들(new Map([['tests/xq/XQ-TP-001.spec.ts', 프로]]), { 'XQ-FN-101': { removed: true } })).toEqual([]);
  });
});
