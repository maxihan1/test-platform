// 프로시저 파일의 검사 규칙 — K1 · K2 · K6 · K12 의 프로시저 줄과 K19 · K20, 한 파일에 테스트가 둘인 K8 (SPEC 공통/2 §4 K표)

import { describe, expect, it } from 'vitest';

import { 구간, 기본선언, 선언, 절차, 정상본문, 프로시저글 } from './procedure-fixture.js';
import { checkRegistration } from './registration.js';
import { checkProcedure, checkSource, RULES } from './rules.js';

const 위반 = (글: string): string[] => checkSource('xq/XQ-TP-001.spec.ts', 글).violations.map((v) => `${v.rule} ${v.what}`);
const 규칙 = (글: string): string[] => checkSource('xq/XQ-TP-001.spec.ts', 글).violations.map((v) => v.rule);
const 줄번호 = (글: string, 찾을: string): number => 글.split('\n').findIndex((l) => l.includes(찾을)) + 1;

describe('프로시저 파일 — 규칙을 지킨 파일', () => {
  it('위반이 없다', () => {
    expect(위반(프로시저글(정상본문))).toEqual([]);
  });

  it('정리 선언과 본문 맨 위의 준비 코드가 있어도 위반이 없다', () => {
    const 본문 = `  const 글쓰기 = new 글쓰기화면(driver);\n  await test.cleanup('올린 글을 지운다', async () => {});\n${정상본문}`;
    expect(위반(프로시저글(본문))).toEqual([]);
  });

  it('통과 줄의 규칙 범위는 K1 부터 K20 까지다 — K21 · K22 는 defineProcedure 가 던져 K8 로 찍힌다', () => {
    expect([RULES[0], RULES.at(-1)]).toEqual(['K1', 'K20']);
  });

  it('케이스마다 키 줄을 케이스 번호로 남기고 프로시저 키 줄은 따로 남긴다', () => {
    const 글 = 프로시저글(정상본문);
    const { caseLines, propLines } = checkSource('xq/XQ-TP-001.spec.ts', 글);
    expect(caseLines.get('XQ-FN-102')?.get('tcId')).toBe(줄번호(글, "tcId: 'XQ-FN-102'"));
    expect([...caseLines.keys()]).toEqual(['XQ-FN-101', 'XQ-FN-102', 'XQ-FN-103']);
    expect(propLines.get('procId')).toBe(줄번호(글, 'procId:'));
  });
});

describe('K1 — 프로시저 1개', () => {
  it('procedure 를 내보내지 않았으면 잡는다', () => {
    expect(규칙(프로시저글(정상본문).replace('export const procedure', 'const procedure'))).toContain('K1');
  });

  it('defineProcedure 가 둘이면 잡는다', () => {
    const 글 = `${프로시저글(정상본문)}\nconst 또 = defineProcedure({ procId: 'XQ-TP-002', name: 'x', platforms: ['android'], precondition: [], cases: [] });\n`;
    expect(위반(글).filter((x) => x.startsWith('K1'))).toHaveLength(1);
  });

  it('케이스 선언을 내보내면 잡는다 — spec 을 같이 내보낸 것도 여기에 걸린다', () => {
    const 글 = 프로시저글(정상본문, { 선언들: `export ${기본선언}` });
    expect(위반(글)).toEqual(['K1 케이스 선언 본문없음 을 내보냈다. 프로시저 파일은 procedure 만 내보낸다']);
  });
});

describe('K19 — cases 는 맨 위에서 선언한 이름만 든 배열 리터럴', () => {
  it('펼침 · 변수 · 그 자리에 적은 선언은 잡는다', () => {
    expect(규칙(프로시저글(정상본문, { cases: '[...묶음]' }))).toContain('K19');
    expect(규칙(프로시저글(정상본문, { cases: '묶음' }))).toContain('K19');
    expect(규칙(프로시저글(정상본문, { cases: '[본문없음, 글자수초과, defineCase({ tcId: "XQ-FN-103" })]' }))).toContain('K19');
  });

  it('이 파일에서 선언하지 않은 이름과 두 번 넣은 이름은 잡는다', () => {
    expect(위반(프로시저글(정상본문, { cases: '[본문없음, 글자수초과, 남의케이스]' }))).toContain(
      'K19 cases 의 남의케이스 는 이 파일 맨 위에서 const 이름 = defineCase(...) 로 선언한 이름이 아니다',
    );
    expect(위반(프로시저글(정상본문, { cases: '[본문없음, 글자수초과, 게시확인, 본문없음]' }))).toContain('K19 cases 에 본문없음 를 두 번 넣었다');
  });

  it('let 으로 선언한 케이스는 맨 위 선언으로 치지 않는다', () => {
    expect(위반(프로시저글(정상본문, { 선언들: 기본선언.replace('const 게시확인', 'let 게시확인') }))).toContain(
      'K19 cases 의 게시확인 는 이 파일 맨 위에서 const 이름 = defineCase(...) 로 선언한 이름이 아니다',
    );
  });

  it('맨 위에서 선언하고 cases 에 안 넣은 케이스는 잡는다', () => {
    const 글 = 프로시저글(정상본문, { 선언들: 기본선언 + 선언('남는것', 'XQ-FN-104') });
    expect(위반(글)).toEqual(['K19 케이스 선언 남는것 이 cases 에 없다. 맨 위 defineCase 선언은 모두 cases 에 든다']);
  });
});

describe('K20 — test.case 는 cases 차례대로 본문 맨 바깥에서 한 번씩', () => {
  const 셋 = (가운데: string): string => 구간('본문없음', '하나') + 가운데 + 구간('게시확인', '셋');

  it('조건문 · 절차 · 다른 케이스 구간 안에서 부르면 잡는다', () => {
    expect(규칙(프로시저글(셋(`  if (driver) {\n${구간('글자수초과', '둘')}  }\n`)))).toContain('K20');
    expect(규칙(프로시저글(셋(절차('감싼다', `\n${구간('글자수초과', '둘')}`))))).toContain('K20');
    expect(규칙(프로시저글(구간('본문없음', '하나', `\n${구간('글자수초과', '둘')}`) + 구간('게시확인', '셋')))).toContain('K20');
  });

  it('빠진 케이스 · 두 번 부른 케이스 · 다른 차례는 잡는다', () => {
    expect(위반(프로시저글(셋('')))).toContain('K20 글자수초과 의 test.case 가 없다. cases 의 케이스마다 차례대로 한 번씩 부른다');
    expect(위반(프로시저글(정상본문 + 구간('게시확인', '또')))).toContain('K20 test.case(게시확인) 를 두 번 불렀다');
    const 뒤바뀜 = 구간('글자수초과', '둘') + 구간('본문없음', '하나') + 구간('게시확인', '셋');
    expect(위반(프로시저글(뒤바뀜))).toEqual(['K20 test.case 차례가 cases 와 다르다. cases 는 본문없음 → 글자수초과 → 게시확인 차례다']);
  });

  it('마지막 케이스 뒤의 절차와 절차 밖 코드를 잡는다 — kit 은 판정에 못 남긴다', () => {
    expect(규칙(프로시저글(정상본문 + 절차('올린 글을 지운다')))).toEqual(['K20']);
    expect(규칙(프로시저글(`${정상본문}  await driver.back();\n`))).toEqual(['K20']);
    expect(규칙(프로시저글(`${정상본문}  await test.cleanup('늦은 정리', async () => {});\n`))).toEqual(['K20']);
  });

  it('첫 인자가 맨 위 선언 이름이 아니면 잡는다', () => {
    expect(규칙(프로시저글(정상본문.replace('test.case(게시확인,', 'test.case(procedure.cases[2],')))).toContain('K20');
  });

  it('옛 꼴 파일에 test.case 를 쓰면 잡는다', () => {
    const 옛꼴 = `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: 'XQ-001', name: 'x', precondition: [], params: null, expected: null });
test(spec, async () => {
${구간('spec', '하나')}});
`;
    expect(위반(옛꼴)).toEqual(['K20 test.case 는 프로시저 파일(test(procedure, …))에서만 쓴다']);
  });
});

describe('K6 · K12 · K4 — 프로시저 줄', () => {
  it('K6 — 판정이 없는 케이스 구간을 그 줄로 잡는다. 앞 준비 절차의 판정은 그 구간의 판정이 아니다', () => {
    const 본문 = 구간('본문없음', '하나') + 절차('준비', ` await verify('준비됐다', true, true); `) + 구간('글자수초과', '둘', '') + 구간('게시확인', '셋');
    const 글 = 프로시저글(본문);
    expect(checkSource('xq/XQ-TP-001.spec.ts', 글).violations).toMatchObject([
      { rule: 'K6', what: 'test.case(글자수초과) 구간에 verify 가 하나도 없다', line: 줄번호(글, 'test.case(글자수초과,') },
    ]);
  });

  it('K12 — 절차 제목은 케이스 구간을 넘어 프로시저 전체에서 서로 다르다', () => {
    const 본문 = 구간('본문없음', '화면을 연다') + 구간('글자수초과', '화면을 연다') + 구간('게시확인', '셋');
    expect(위반(프로시저글(본문))).toEqual(['K12 절차 제목 「화면을 연다」이 이 프로시저 안에서 겹친다']);
  });

  it('K4 · K13 — 케이스 선언마다 본다', () => {
    const 선언들 = 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102').replace('  expected: null,\n', '') + 선언('게시확인', 'XQ-FN-103', "\n  held: '',");
    const 글 = 프로시저글(정상본문, { 선언들 });
    expect(checkSource('xq/XQ-TP-001.spec.ts', 글).violations).toMatchObject([
      { rule: 'K4', what: 'expected 키가 아예 없다. 없으면 없다고 적어야 한다', line: 줄번호(글, 'const 글자수초과') },
      { rule: 'K13', line: 줄번호(글, "held: ''") },
    ]);
  });
});

describe('K8 — 프로시저 파일도 테스트는 하나다', () => {
  it('test(procedure, …) 가 둘이면 그 파일의 둘째 줄로 잡는다 — Playwright 의 오류는 kit 파일을 가리킨다', () => {
    const 글 = `${프로시저글(정상본문)}\ntest(procedure, async () => {});\n`;
    expect(checkSource('xq/XQ-TP-001.spec.ts', 글).violations).toContainEqual(
      expect.objectContaining({ rule: 'K8', what: 'test(procedure, …) 가 2개다. 파일 1개 = 테스트 1개다', line: 줄번호(글, 'test(procedure, async () => {});') }),
    );
  });

  it('test(procedure, …) 가 없으면 잡는다', () => {
    expect(규칙(프로시저글(정상본문).replace('test(procedure, async', 'void (async'))).toContain('K8');
  });

  it('Playwright 가 같은 제목 둘로 수집을 못 하면 등록 검사가 K8 로 알린다', () => {
    const report = {
      errors: [{ message: 'Error: duplicate test title "글쓰기 — 입력 제한부터 게시까지", first declared in procedure.ts:163', location: { file: 'packages/kit/src/runtime/procedure.ts', line: 163 } }],
      suites: [],
    };
    expect(checkRegistration(report, ['xq/XQ-TP-001.spec.ts']).map((v) => [v.rule, v.file])).toEqual([
      ['K8', 'packages/kit/src/runtime/procedure.ts'],
      ['K8', 'xq/XQ-TP-001.spec.ts'],
    ]);
  });

  it('테스트 하나로 등록된 프로시저 파일은 위반이 없고, 제목이 둘이면 잡는다', () => {
    const suite = (titles: string[]) => ({ suites: [{ file: 'xq/XQ-TP-001.spec.ts', specs: titles.map((title) => ({ title })) }] });
    expect(checkRegistration(suite(['글쓰기', '글쓰기']), ['xq/XQ-TP-001.spec.ts'])).toEqual([]);
    expect(checkRegistration(suite(['글쓰기', '댓글']), ['xq/XQ-TP-001.spec.ts'])[0]).toMatchObject({ rule: 'K8', what: expect.stringContaining('2개') });
  });
});

describe('K2 — 프로시저 번호', () => {
  const 본 = (file: string, procId: string, 겹친: string[] = []): string[] => checkProcedure(file, procId, new Map([['procId', 7]]), 겹친).map((v) => `${v.rule}:${v.line} ${v.what}`);

  it('<접두사>-TP-<3자리> 이고 파일 이름이 번호와 같으면 위반이 없다', () => {
    expect(본('xq/XQ-TP-001.spec.ts', 'XQ-TP-001')).toEqual([]);
  });

  it('꼴이 어긋나면 procId 줄로 잡는다 — 케이스 번호 꼴 · 두 자리 · 소문자', () => {
    for (const 번호 of ['XQ-FN-001', 'XQ-TP-01', 'xq-TP-001', 'XQ-TP-0001']) {
      expect(본(`xq/${번호}.spec.ts`, 번호)[0]).toContain(`K2:7 procId가 ${번호}이다`);
    }
  });

  it('파일 이름이 <procId>.spec.ts 가 아니면 잡는다', () => {
    expect(본('xq/글쓰기.spec.ts', 'XQ-TP-001')).toEqual(['K2:7 파일 이름이 글쓰기.spec.ts이다. 프로시저 파일 이름은 <procId>.spec.ts 다 — XQ-TP-001.spec.ts']);
  });

  it('같은 번호를 쓴 다른 파일이 있으면 잡는다', () => {
    expect(본('xq/XQ-TP-001.spec.ts', 'XQ-TP-001', ['xr/XQ-TP-001.spec.ts'])).toEqual(['K2:7 procId XQ-TP-001이 xr/XQ-TP-001.spec.ts와 겹친다']);
  });
});
