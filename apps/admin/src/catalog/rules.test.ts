// SPEC §4 케이스 파일 규칙 K1~K10 검사기가 위반을 정확히 집어내는지 검사한다

import { describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { checkRegistration, checkSource, checkSpec, formatViolation } from './rules.js';

const 정상 = `import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  precondition: [],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('제목이 보인다', true, true);
  });
});
`;

function rules(source: string): string[] {
  return checkSource('x.spec.ts', source).violations.map((v) => v.rule);
}

function spec(over: Partial<CaseSpec> = {}): CaseSpec {
  return {
    tcId: 'DEMO-001',
    name: '메인 화면이 열린다',
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: 'demo/DEMO-001.spec.ts',
    ...over,
  };
}

describe('checkSource', () => {
  it('규칙을 지킨 파일은 위반이 없다', () => {
    expect(rules(정상)).toEqual([]);
  });

  it('K1 — defineCase 선언이 없으면 잡는다', () => {
    expect(rules(`export const spec = 1;\n`)).toContain('K1');
  });

  it('K1 — defineCase 선언이 둘이면 잡는다', () => {
    expect(rules(정상 + 정상)).toContain('K1');
  });

  it('K4 — params 키가 아예 없으면 잡는다', () => {
    const 빠짐 = 정상.replace('  params: null,\n', '');
    const found = checkSource('x.spec.ts', 빠짐).violations;
    expect(found.map((v) => v.rule)).toContain('K4');
    expect(found[0].what).toContain('params');
  });

  it('K4 — null과 빈 배열로 적은 것은 통과한다', () => {
    expect(rules(정상)).toEqual([]);
  });

  it('K6 — test.step 제목이 빈 문자열이면 잡는다', () => {
    expect(rules(정상.replace("'화면을 연다'", "''"))).toContain('K6');
  });

  it('K6 — verify 문장이 변수면 잡는다', () => {
    expect(rules(정상.replace("'제목이 보인다'", '문장'))).toContain('K6');
  });

  it('K6 — verify가 하나도 없으면 잡는다', () => {
    const 없음 = 정상.replace(/await verify\([^\n]*\n/, '');
    expect(rules(없음)).toContain('K6');
  });

  it('K7 — 주석이 있으면 잡는다', () => {
    expect(rules(정상.replace('test(spec,', '// 로그인 절차\ntest(spec,'))).toContain('K7');
  });

  it('K7 — 블록 주석도 잡는다', () => {
    expect(rules(정상.replace('test(spec,', '/* 설명 */\ntest(spec,'))).toContain('K7');
  });

  it('K7 — 문자열 안의 URL은 주석이 아니다', () => {
    expect(rules(정상)).toEqual([]);
  });

  it('K7 — 정규식 리터럴 안의 슬래시도 주석이 아니다', () => {
    const 정규식 = 정상.replace(
      "await verify('제목이 보인다', true, true);",
      "await verify('숫자만 남는다', '1개'.replace(/[^0-9]/g, ''), '1');",
    );
    expect(rules(정규식)).toEqual([]);
  });

  it('K7 — expect 직접 호출을 잡는다', () => {
    expect(rules(정상.replace('await verify(', 'await expect('))).toContain('K7');
  });

  it('defineCase의 키마다 줄 번호를 남긴다', () => {
    const { propLines } = checkSource('x.spec.ts', 정상);
    expect(propLines.get('tcId')).toBe(5);
    expect(propLines.get('expected')).toBe(9);
  });
});

describe('checkSpec', () => {
  const lines = new Map<string, number>([['tcId', 5], ['name', 6], ['platforms', 7]]);

  it('규칙을 지킨 명세는 위반이 없다', () => {
    expect(checkSpec('x.spec.ts', spec(), lines)).toEqual([]);
  });

  it('K2 — tcId 형식이 어긋나면 잡는다', () => {
    expect(checkSpec('x.spec.ts', spec({ tcId: 'demo-1' }), lines)[0].rule).toBe('K2');
  });

  it('K2 — 위반은 tcId가 적힌 줄을 가리킨다', () => {
    expect(checkSpec('x.spec.ts', spec({ tcId: 'TOOLONGDOMAIN-001' }), lines)[0].line).toBe(5);
  });

  it('K2 — 접두사는 자유 형식이다. 한 글자도 숫자 섞인 것도 통과한다', () => {
    for (const tcId of ['A-001', 'PAY-001', 'DEMO2-001', 'ORDERPAYMENT-999']) {
      expect(checkSpec('x.spec.ts', spec({ tcId }), lines)).toEqual([]);
    }
  });

  it('K2 — 열두 글자를 넘거나 소문자이거나 숫자로 시작하면 잡는다', () => {
    for (const tcId of ['TOOLONGDOMAIN-001', 'Pay-001', '2PAY-001', 'PAY-1']) {
      expect(checkSpec('x.spec.ts', spec({ tcId }), lines)[0]?.rule).toBe('K2');
    }
  });

  it('K3 — name이 비면 잡는다', () => {
    expect(checkSpec('x.spec.ts', spec({ name: '  ' }), lines)[0].rule).toBe('K3');
  });

  it('K5 — 선언에 없는 환경이 있으면 잡는다', () => {
    const 잘못 = spec({ platforms: ['desktop', 'tablet'] as CaseSpec['platforms'] });
    expect(checkSpec('x.spec.ts', 잘못, lines)[0].rule).toBe('K5');
  });

  it('K4 — 스키마 필드에 describe가 없으면 잡는다', () => {
    const 라벨없음 = spec({
      paramSchema: { type: 'object', properties: { todo: { type: 'string' } } },
    });
    const found = checkSpec('x.spec.ts', 라벨없음, lines);
    expect(found[0].rule).toBe('K4');
    expect(found[0].what).toContain('todo');
  });

  it('K4 — describe가 있으면 통과한다', () => {
    const 라벨있음 = spec({
      paramSchema: { type: 'object', properties: { todo: { type: 'string', description: '할 일' } } },
    });
    expect(checkSpec('x.spec.ts', 라벨있음, lines)).toEqual([]);
  });

  const 칸 = (name: string, extra: Record<string, unknown> = {}): CaseSpec['paramSchema'] => ({
    type: 'object',
    properties: { [name]: { type: 'string', description: '설명', ...extra } },
  });

  it('K9 — 비밀값 이름인데 꼬리표가 없으면 잡는다', () => {
    const found = checkSpec('x.spec.ts', spec({ paramSchema: 칸('password') }), lines);
    expect(found[0].rule).toBe('K9');
    expect(found[0].what).toContain('password');
  });

  it('K9 — 꼬리표가 붙어 있으면 통과한다', () => {
    const 꼬리표 = spec({ paramSchema: 칸('password', { secret: true }) });
    expect(checkSpec('x.spec.ts', 꼬리표, lines)).toEqual([]);
  });

  it('K9 — 이름 안에 들어 있기만 해도 잡고 대소문자를 가리지 않는다', () => {
    for (const name of ['userPassword', 'accessToken', 'apiKey', 'CREDENTIAL', 'pw', 'passwd', 'clientSecret']) {
      expect(checkSpec('x.spec.ts', spec({ paramSchema: 칸(name) }), lines)[0]?.rule).toBe('K9');
    }
  });

  it('K9 — 기대결과 칸은 보지 않는다. 비밀값은 입력에만 있다', () => {
    const 기대에만 = spec({ expectedSchema: 칸('token') });
    expect(checkSpec('x.spec.ts', 기대에만, lines).map((v) => v.rule)).not.toContain('K9');
  });

  it('K9 — 이름이 비슷하지 않은 칸은 지나친다', () => {
    expect(checkSpec('x.spec.ts', spec({ paramSchema: 칸('todo') }), lines)).toEqual([]);
  });

  it('K10 — 반드시 받아야 하는 칸이 있으면 잡는다', () => {
    const 필수 = spec({
      paramSchema: { ...칸('todo'), required: ['todo'] },
    });
    const found = checkSpec('x.spec.ts', 필수, lines);
    expect(found[0].rule).toBe('K10');
    expect(found[0].what).toContain('todo');
  });

  it('K10 — 기대결과 칸도 본다', () => {
    const 필수 = spec({
      expectedSchema: { ...칸('statusCode'), required: ['statusCode'] },
    });
    expect(checkSpec('x.spec.ts', 필수, lines)[0].rule).toBe('K10');
  });

  it('K10 — required가 비어 있으면 통과한다', () => {
    const 기본값 = spec({
      paramSchema: { ...칸('todo', { default: '첫 번째 할 일' }), required: [] },
    });
    expect(checkSpec('x.spec.ts', 기본값, lines)).toEqual([]);
  });

  it('K10 — 위반은 params가 적힌 줄을 가리킨다', () => {
    const 줄 = new Map<string, number>([...lines, ['params', 9]]);
    const 필수 = spec({ paramSchema: { ...칸('todo'), required: ['todo'] } });
    expect(checkSpec('x.spec.ts', 필수, 줄)[0].line).toBe(9);
  });
});

describe('checkRegistration', () => {
  // --list --reporter=json은 프로젝트 수만큼 spec을 중복해 내보낸다. 제목이 몇 가지인지로 봐야 한다 (LEARNINGS WS-C)
  const suite = (file: string, titles: string[]) => ({
    file,
    specs: titles.map((title) => ({ title, file })),
  });

  it('파일마다 테스트 1개면 위반이 없다', () => {
    const report = { suites: [suite('demo/A.spec.ts', ['화면이 열린다', '화면이 열린다'])] };
    expect(checkRegistration(report, ['demo/A.spec.ts'])).toEqual([]);
  });

  it('K8 — 등록되지 않은 파일을 잡는다', () => {
    const found = checkRegistration({ suites: [] }, ['demo/A.spec.ts']);
    expect(found[0].rule).toBe('K8');
    expect(found[0].file).toBe('demo/A.spec.ts');
  });

  it('K8 — 한 파일에 테스트가 둘이면 잡는다', () => {
    const report = { suites: [suite('demo/A.spec.ts', ['하나', '둘'])] };
    expect(checkRegistration(report, ['demo/A.spec.ts'])[0].what).toContain('2개');
  });

  it('K8 — describe로 감싼 테스트도 센다', () => {
    const report = {
      suites: [{ file: 'demo/A.spec.ts', specs: [], suites: [suite('demo/A.spec.ts', ['하나'])] }],
    };
    expect(checkRegistration(report, ['demo/A.spec.ts'])).toEqual([]);
  });

  it('K8 — 수집 단계의 에러를 그 줄에 붙여 알린다', () => {
    const report = {
      errors: [{ message: 'Cannot find module', location: { file: 'demo/A.spec.ts', line: 3 } }],
      suites: [],
    };
    const found = checkRegistration(report, []);
    expect(found[0]).toMatchObject({ rule: 'K8', file: 'demo/A.spec.ts', line: 3 });
  });
});

describe('formatViolation', () => {
  it('파일:줄 — 무엇이 — 왜 문제 한 줄로 적는다', () => {
    const line = formatViolation({
      file: 'demo/DEMO-001.spec.ts',
      line: 5,
      rule: 'K2',
      what: 'tcId가 demo-1이다',
      why: '검색·이력·문서 번호가 깨진다',
    });
    expect(line).toBe('demo/DEMO-001.spec.ts:5 — [K2] tcId가 demo-1이다 — 검색·이력·문서 번호가 깨진다');
  });
});
