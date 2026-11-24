// 보류 반영이 프로시저 파일 안 케이스를 걷는 순수 함수 검사 — 케이스 걷기 · 절 고치기 · 케이스 하나 반영
import { describe, expect, it } from 'vitest';

import { checkSource } from '../apps/admin/src/catalog/rules.js';
import { 구간, 선언, 절차, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import { 값적기, 보류남은번호들, 보류남음, 케이스tcId, 케이스tcId들 } from './authoring-held-apply.js';
import { 보류반영, 절케이스빼기, 케이스걷기 } from './authoring-held-proc.js';

const 보류 = (사유: string) => `\n  held: '판정 불가 — ${사유}',`;
const 셋선언 = 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102', 보류('기준 없음')) + 선언('게시확인', 'XQ-FN-103');
// 가운데 준비 절차와 마지막 케이스 앞 준비 절차가 다 있어야 가운데 · 마지막 걷기가 갈린다
const 본문 =
  절차('글쓰기 화면을 연다', ` await verify('글쓰기 화면이 보인다', true, true); `) +
  구간('본문없음', '본문을 비운다') +
  구간('글자수초과', '본문에 501자를 넣는다') +
  절차('본문을 고친다', ` await verify('게시 버튼이 켜진다', true, true); `) +
  구간('게시확인', '게시를 누른다');
const 글 = 프로시저글(본문, { 선언들: 셋선언 });

function 걷음(원문: string, tcId: string): { 글: string; 남은: number } {
  const r = 케이스걷기(원문, tcId);
  if ('사유' in r) throw new Error(r.사유);
  return r;
}

function 규칙위반(원문: string): string[] {
  return checkSource('XQ-TP-001.spec.ts', 원문).violations.map((v) => `${v.rule} ${v.what}`);
}

describe('케이스걷기 — 그 케이스만 원문에서 잘라 낸다', () => {
  it('가운데 케이스 — 선언 · cases 자리 · 구간이 빠지고 나머지 줄은 그대로다', () => {
    const r = 걷음(글, 'XQ-FN-102');
    const 원줄 = new Set(글.split('\n'));
    expect(r.남은).toBe(2);
    expect(r.글).not.toContain('글자수초과');
    expect(r.글).toContain('cases: [본문없음, 게시확인]');
    expect(r.글).toContain('본문을 고친다');
    expect(r.글.split('\n').filter((줄) => !원줄.has(줄))).toEqual(['  cases: [본문없음, 게시확인],']);
    expect(규칙위반(r.글)).toEqual([]);
  });

  it('첫 케이스 — cases 의 쉼표까지 걷고 K 규칙을 통과한다', () => {
    const r = 걷음(글, 'XQ-FN-101');
    expect(r.남은).toBe(2);
    expect(r.글).toContain('cases: [글자수초과, 게시확인]');
    expect(규칙위반(r.글)).toEqual([]);
  });

  it('마지막 케이스 — 그 앞 준비 절차도 걷는다(남으면 마지막 test.case 뒤 절차라 K20)', () => {
    const r = 걷음(글, 'XQ-FN-103');
    expect(r.남은).toBe(2);
    expect(r.글).toContain('cases: [본문없음, 글자수초과]');
    expect(r.글).not.toContain('본문을 고친다');
    expect(r.글).not.toContain('게시확인');
    expect(규칙위반(r.글)).toEqual([]);
  });

  it('유일한 케이스면 남은이 0 이다', () => {
    const 하나 = 프로시저글(구간('본문없음', '비운다'), { 선언들: 선언('본문없음', 'XQ-FN-101'), cases: '[본문없음]' });
    expect(걷음(하나, 'XQ-FN-101').남은).toBe(0);
  });

  it('여러 줄 cases 의 마지막 케이스(끝 쉼표)도 앞 원소 뒤 쉼표부터 걷는다', () => {
    const 여러줄 = 프로시저글(본문, { 선언들: 셋선언, cases: '[\n    본문없음,\n    글자수초과,\n    게시확인,\n  ]' });
    const r = 걷음(여러줄, 'XQ-FN-103');
    expect(r.글).toContain('[\n    본문없음,\n    글자수초과,\n  ]');
    expect(규칙위반(r.글)).toEqual([]);
  });

  describe('안 쓰게 된 import', () => {
    // 선언 helper 의 extra 칸은 z 가 쓰였다는 표시일 뿐이라 K 규칙은 안 본다
    const 가져오기 = [
      "import { z } from 'zod';",
      "import { 도우미, 남는것 } from './도우미.js';",
      "import * as 틀 from './틀.js';",
      "import 기본 from './기본.js';",
      "import './부수.js';",
    ].join('\n');
    const 쓰는선언 = 선언('본문없음', 'XQ-FN-101', `\n  extra: z.string(),`) + 선언('글자수초과', 'XQ-FN-102', `\n  extra: z.string(),`) + 선언('게시확인', 'XQ-FN-103');
    const 쓰는본문 = 구간('본문없음', '비운다', ` await 남는것(); `) + 구간('글자수초과', '넘긴다', ` await 도우미(틀.값, 기본); `) + 구간('게시확인', '누른다', ` await 남는것(); `);
    const 원문 = 프로시저글(쓰는본문, { 가져오기, 선언들: 쓰는선언 });

    it('걷은 케이스에만 쓰이던 이름은 지우고 다 빠진 import 문은 통째로 지운다 — 부수 효과 import 는 둔다', () => {
      const r = 걷음(원문, 'XQ-FN-102');
      expect(r.글).toContain("import { 남는것 } from './도우미.js';");
      expect(r.글).toContain("import './부수.js';");
      expect(r.글).toContain("import { z } from 'zod';");
      expect(r.글).not.toContain('./틀.js');
      expect(r.글).not.toContain('./기본.js');
    });

    it('다른 케이스가 쓰는 이름은 남기고 마지막 사용이 사라진 이름은 지운다', () => {
      const 첫걷음 = 걷음(원문, 'XQ-FN-102');
      expect(첫걷음.글).toContain("import { z } from 'zod';");
      const 둘걷음 = 걷음(첫걷음.글, 'XQ-FN-101');
      expect(둘걷음.글).not.toContain('zod');
      expect(둘걷음.글).toContain("import { 남는것 } from './도우미.js';");
    });

    it('걷기 전에도 안 쓰던 이름은 건드리지 않는다', () => {
      const 안쓰던 = 프로시저글(구간('본문없음', '비운다') + 구간('글자수초과', '넘긴다') + 구간('게시확인', '누른다'), { 가져오기 });
      expect(걷음(안쓰던, 'XQ-FN-102').글).toContain("import { z } from 'zod';");
    });
  });

  it('구간을 못 가른 파일 · 못 찾는 번호 · 변수 여럿 선언은 사유를 낸다', () => {
    const 깨진 = 프로시저글(본문, { 선언들: 셋선언, cases: '[본문없음, 글자수초과, 게시확인, 없는것]' });
    expect(케이스걷기(깨진, 'XQ-FN-102')).toEqual({ 사유: expect.stringContaining('구간') });
    expect(케이스걷기(글, 'XQ-FN-999')).toEqual({ 사유: expect.stringContaining('선언') });
    const 여럿 = 프로시저글(본문, { 선언들: 셋선언.replace('const 글자수초과 = defineCase', 'const 덤 = 1, 글자수초과 = defineCase') });
    expect(케이스걷기(여럿, 'XQ-FN-102')).toEqual({ 사유: expect.stringContaining('여럿') });
  });
});

describe('절케이스빼기 — 케이스 목록 문서의 테스트 프로시저 절', () => {
  const 표 = [
    '## 요구사항',
    '',
    '| 요구 | tcId |',
    '|---|---|',
    '| 1 | XQ-FN-101 |',
    '',
    '## 테스트 프로시저',
    '',
    '| 프로시저 | 흐름 | 케이스 |',
    '|---|---|---|',
    '| `XQ-TP-001` | 글쓰기 | XQ-FN-101 → XQ-FN-102 → XQ-FN-103 |',
    '| `XQ-TP-002` | 혼자 | XQ-FN-201 |',
    '',
    '## 다음 절',
  ].join('\n');

  it('그 번호만 빼고 남은 번호를 → 로 잇는다', () => {
    const 고침 = 절케이스빼기(표, 'XQ-FN-102');
    expect(고침).toContain('| XQ-FN-101 → XQ-FN-103 |');
    expect(고침).toContain('| 1 | XQ-FN-101 |');
    expect(절케이스빼기(고침, 'XQ-FN-102')).toBe(고침);
  });

  it('남은 번호가 없으면 그 줄을 지운다 — 다른 줄과 절은 그대로다', () => {
    const 고침 = 절케이스빼기(표, 'XQ-FN-201');
    expect(고침).not.toContain('XQ-TP-002');
    expect(고침).toContain('XQ-TP-001');
    expect(고침).toContain('## 다음 절');
  });

  it('절에 없는 번호는 표를 안 바꾼다', () => {
    expect(절케이스빼기(표, 'XQ-FN-999')).toBe(표);
  });
});

describe('보류반영 — 값 채우기 · 제거', () => {
  it('값은 그 번호의 선언에 적고 파일은 안 지운다', () => {
    const 값글 = 프로시저글(본문, {
      선언들:
        선언('본문없음', 'XQ-FN-101') +
        선언('글자수초과', 'XQ-FN-102', 보류('기준 없음')).replace('params: null', "params: z.object({ 수: z.number().describe('수') })") +
        선언('게시확인', 'XQ-FN-103'),
    });
    const r = 보류반영(값글, 'XQ-FN-102', { params: { 수: 501 } });
    if ('사유' in r) throw new Error(r.사유);
    expect(r.글).toContain(".describe('수').default(501)");
    expect(r.지움).toBe(false);
    expect(보류남은번호들(r.글)).toEqual([]);
  });

  it('프로시저 파일 제거는 그 케이스만 걷고, 옛 꼴 파일 제거는 파일을 지운다', () => {
    const r = 보류반영(글, 'XQ-FN-102', { removed: true });
    if ('사유' in r) throw new Error(r.사유);
    expect(r.지움).toBe(false);
    expect(r.글).not.toContain('글자수초과');
    const 옛꼴 = `import { defineCase, test } from '@platform/kit';\nexport const spec = defineCase({ tcId: 'XQ-FN-201' });\n`;
    expect(보류반영(옛꼴, 'XQ-FN-201', { removed: true })).toEqual({ 글: 옛꼴, 지움: true });
  });
});

describe('프로시저 파일 — 선언이 여럿이다', () => {
  const 셋 = `const 가 = defineCase({
  tcId: 'XHA-FN-101',
  name: '가',
  params: z.object({ 값: z.string().describe('값') }),
  expected: z.object({}),
});
const 나 = defineCase({
  tcId: 'XHA-FN-102',
  name: '나',
  held: '판정 불가 — 값을 모른다',
  params: z.object({ 값: z.string().describe('값') }),
  expected: z.object({}),
});
const 다 = defineCase({
  tcId: 'XHA-FN-103',
  name: '다',
  held: '판정 불가 — 다른 값을 모른다',
  params: z.object({ 값: z.string().describe('값') }),
  expected: z.object({}),
});
`;

  it('값적기는 번호의 선언에만 적고 그 선언의 held 만 뺀다', () => {
    const 글 = (값적기(셋, { params: { 값: 'B' } }, 'XHA-FN-102') as { 글: string }).글;
    expect(글).toContain("z.string().describe('값').default('B')");
    expect(글.match(/\.default\(/g)).toHaveLength(1);
    expect(보류남은번호들(글)).toEqual(['XHA-FN-103']);
    expect(글).toContain("tcId: 'XHA-FN-101'");
  });

  it('같은 파일 보류 둘 — 앞 고침 결과 위에 차례로 적으면 둘 다 남는다', () => {
    const 앞 = 값적기(셋, { params: { 값: 'B' } }, 'XHA-FN-102') as { 글: string };
    const 뒤 = 값적기(앞.글, { params: { 값: 'C' } }, 'XHA-FN-103') as { 글: string };
    expect(뒤.글).toContain("default('B')");
    expect(뒤.글).toContain("default('C')");
    expect(보류남음(뒤.글)).toBe(false);
  });

  it('보류남음 · 케이스tcId들은 모든 선언을 본다', () => {
    expect(보류남음(셋)).toBe(true);
    expect(보류남은번호들(셋)).toEqual(['XHA-FN-102', 'XHA-FN-103']);
    expect(케이스tcId들(셋)).toEqual(['XHA-FN-101', 'XHA-FN-102', 'XHA-FN-103']);
    expect(케이스tcId(셋)).toBe('XHA-FN-101');
  });
});
