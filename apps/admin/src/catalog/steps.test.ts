// 케이스 소스에서 「만들기」 절차와 request 사용을 가려내는 판별이 안전한 쪽으로 무너지는지 검사한다

import { describe, expect, it } from 'vitest';

import { caseSteps } from './steps.js';

function body(inner: string, fixtures = '{ page }'): string {
  return `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'DEMO-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async (${fixtures}) => {
${inner}
});
`;
}

const R16 = body(`
  await test.step('할 일을 만든다', async () => {
    await page.getByRole('textbox').fill('우유');
  });
  await test.step('할 일이 한 건인지 확인한다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
  await test.step('완료를 누른다', async () => {
    await verify('완료된다', true, true);
  });
`);

function skippable(source: string): boolean[] {
  return caseSteps(source).steps.map((s) => s.skippable);
}

describe('caseSteps', () => {
  it('판정 없는 절차 바로 뒤에 blocker 절차가 오면 앞 것이 「만들기」다', () => {
    const found = caseSteps(R16);
    expect(found.steps.map((s) => [s.title, s.skippable])).toEqual([
      ['할 일을 만든다', true],
      ['할 일이 한 건인지 확인한다', false],
      ['완료를 누른다', false],
    ]);
    expect(found.r16).toBe(true);
  });

  it('절차마다 소스 줄을 싣는다', () => {
    expect(caseSteps(R16).steps.map((s) => s.line)).toEqual([7, 10, 13]);
  });

  it('조작과 blocker 판정이 한 절차에 붙은 옛 케이스는 건너뛸 것이 없다', () => {
    const old = body(`
  await test.step('화면을 열고 한 건을 만든다', async () => {
    await page.goto('https://x');
    await verify('한 건이다', 1, 1, { blocker: true });
  });
  await test.step('완료를 누른다', async () => {
    await verify('완료된다', true, true);
  });
`);
    expect(skippable(old)).toEqual([false, false]);
    expect(caseSteps(old).r16).toBe(false);
  });

  it('다음 절차의 판정이 blocker 가 아니면 「만들기」가 아니다', () => {
    expect(skippable(R16.replace(', { blocker: true }', ''))[0]).toBe(false);
  });

  it('blocker 를 변수로 넘기면 blocker 로 치지 않는다', () => {
    const viaVar = R16.replace('{ blocker: true }', 'opts');
    expect(skippable(viaVar)[0]).toBe(false);
  });

  it('blocker: false 는 blocker 가 아니다', () => {
    expect(skippable(R16.replace('blocker: true', 'blocker: false'))[0]).toBe(false);
  });

  it('마지막 절차는 판정이 없어도 「만들기」가 아니다', () => {
    const last = body(`
  await test.step('확인한다', async () => {
    await verify('보인다', true, true, { blocker: true });
  });
  await test.step('정리한다', async () => {
    await page.close();
  });
`);
    expect(skippable(last)).toEqual([false, false]);
  });

  it('반복문 안의 절차는 「만들기」로 치지 않는다 — 하나를 풀면 전부 건너뛴다', () => {
    const loop = R16.replace(
      `  await test.step('할 일을 만든다', async () => {
    await page.getByRole('textbox').fill('우유');
  });`,
      `  for (const t of ['우유', '빵']) {
    await test.step('할 일을 만든다', async () => {
      await page.getByRole('textbox').fill(t);
    });
  }`,
    );
    expect(skippable(loop)[0]).toBe(false);
  });

  it('도우미 함수 안의 절차는 「만들기」로 치지 않는다', () => {
    const helper = R16.replace(
      `  await test.step('할 일을 만든다', async () => {
    await page.getByRole('textbox').fill('우유');
  });`,
      `  const make = async () => {
    await test.step('할 일을 만든다', async () => {
      await page.getByRole('textbox').fill('우유');
    });
  };
  await make();`,
    );
    expect(skippable(helper)[0]).toBe(false);
  });

  it('본문이 맨 함수를 부르면 「만들기」로 치지 않는다 — 그 안의 판정이 안 보인다', () => {
    const bare = R16.replace(`await page.getByRole('textbox').fill('우유');`, `await fillTodo(page);`);
    expect(skippable(bare)[0]).toBe(false);
  });

  it('안에 절차를 품은 절차는 「만들기」로 치지 않는다 — 건너뛰면 안쪽 판정까지 사라진다', () => {
    const nested = body(`
  await test.step('준비한다', async () => {
    await test.step('안쪽에서 확인한다', async () => {
      await verify('보인다', true, true, { blocker: true });
    });
  });
  await test.step('조작한다', async () => {
    await verify('된다', true, true);
  });
`);
    expect(caseSteps(nested).steps.map((s) => s.title)).toEqual(['준비한다', '안쪽에서 확인한다', '조작한다']);
    expect(skippable(nested)).toEqual([false, false, false]);
  });

  it('안쪽 절차의 판정은 바깥 절차의 판정으로 세지 않는다', () => {
    const nested = body(`
  await test.step('바깥', async () => {
    await test.step('만든다', async () => {
      await page.getByRole('textbox').fill('우유');
    });
    await test.step('확인한다', async () => {
      await verify('보인다', true, true, { blocker: true });
    });
  });
`);
    expect(skippable(nested)).toEqual([false, true, false]);
  });

  it('본문을 이름으로 넘긴 절차는 「만들기」로 치지 않는다 — 그 안의 판정이 안 보인다', () => {
    const named = R16.replace(
      `  await test.step('할 일을 만든다', async () => {
    await page.getByRole('textbox').fill('우유');
  });`,
      `  const make = async () => {
    await verify('만들어진다', 1, 1);
  };
  await test.step('할 일을 만든다', make);`,
    );
    expect(skippable(named)[0]).toBe(false);
  });

  it.each([
    ['kit.verify', `await kit.verify('숨은 판정', 1, 2);`],
    ['객체 도우미', `await checks.all(page);`],
    ['대괄호 도우미', `await helpers['check'](page);`],
  ])('fixture 가 아닌 것에서 점으로 부르면 「만들기」로 치지 않는다 — %s', (_, call) => {
    const member = R16.replace(`await page.getByRole('textbox').fill('우유');`, call);
    expect(skippable(member)[0]).toBe(false);
  });

  it('그 절차 안에서 fixture 로 만든 변수를 부르는 것은 괜찮다', () => {
    const local = R16.replace(
      `await page.getByRole('textbox').fill('우유');`,
      `const input = page.getByRole('textbox');\n    await input.fill(params.todo);`,
    );
    expect(skippable(local)[0]).toBe(true);
  });

  it('그 절차 안의 변수라도 함수를 담으면 「만들기」로 치지 않는다', () => {
    const fn = R16.replace(
      `await page.getByRole('textbox').fill('우유');`,
      `const box = { go: async () => verify('숨은 판정', 1, 2) };\n    await box.go();`,
    );
    expect(skippable(fn)[0]).toBe(false);
  });

  it('제목이 리터럴이 아닌 절차가 끼면 바로 다음 절차로 건너뛰어 고르지 않는다', () => {
    const between = R16.replace(
      `  await test.step('할 일이 한 건인지`,
      `  await test.step(title, async () => {\n    await page.reload();\n  });\n  await test.step('할 일이 한 건인지`,
    );
    expect(caseSteps(between).steps.every((s) => !s.skippable)).toBe(true);
  });

  it.each([
    ['나머지로 받음', '{ page, ...rest }'],
    ['문자열 키', "{ 'request': r }"],
  ])('request 를 쓰는지 모르면 쓴다고 본다 — %s', (_, fixtures) => {
    expect(caseSteps(body('', fixtures)).usesRequest).toBe(true);
  });

  it('page.request 도 브라우저 밖 통로라 request 사용이다', () => {
    expect(caseSteps(body(`  await test.step('부른다', async () => {\n    await page.request.get('/x');\n  });`)).usesRequest).toBe(true);
  });

  it('test 본문을 이름으로 넘기면 request 를 쓴다고 본다', () => {
    const named = `import { defineCase, test } from '@platform/kit';\nexport const spec = defineCase({ tcId: 'DEMO-001', name: 'x', precondition: [], params: null, expected: null });\ntest(spec, run);\n`;
    expect(caseSteps(named).usesRequest).toBe(true);
  });

  it('제목이 문자열 리터럴이 아닌 절차는 목록에 싣지 않는다 (K6 이 잡는다)', () => {
    const dynamic = R16.replace(`test.step('할 일을 만든다'`, 'test.step(title');
    expect(caseSteps(dynamic).steps.map((s) => s.title)).toEqual(['할 일이 한 건인지 확인한다', '완료를 누른다']);
  });

  it('request 를 꺼내 쓰면 usesRequest 다', () => {
    expect(caseSteps(body('', '{ request, params }')).usesRequest).toBe(true);
    expect(caseSteps(body('', '{ page }')).usesRequest).toBe(false);
  });

  it('구조 분해가 아니라 이름 하나로 받으면 request 를 쓴다고 본다 — 경고가 빠지는 쪽보다 낫다', () => {
    expect(caseSteps(body('', 'fixtures')).usesRequest).toBe(true);
  });
});

describe('caseSteps — Page Object', () => {
  const PAGE = `import { 로그인화면 } from './pages/login.page.js';\n`;
  const FILL = `await page.getByRole('textbox').fill('우유');`;
  const po = (step: string, outside = '', head = PAGE): string =>
    head + R16.replace(FILL, step).replace('async ({ page }) => {\n', `async ({ page }) => {\n${outside}`);

  it('절차 안에서 Page Object 를 만들어 부르면 「만들기」다', () => {
    expect(skippable(po(`const 화면 = new 로그인화면(page);\n    await 화면.열기();`))[0]).toBe(true);
  });

  it('test 본문에서 만든 Page Object 를 절차 안에서 불러도 「만들기」다', () => {
    expect(skippable(po(`await 화면.열기();`, `  const 화면 = new 로그인화면(page);\n`))[0]).toBe(true);
  });

  it('만들자마자 부르거나 클래스에서 바로 불러도 「만들기」다', () => {
    expect(skippable(po(`await new 로그인화면(page).열기();\n    await 로그인화면.주소();`))[0]).toBe(true);
  });

  it('components 의 Component 도 같다', () => {
    const head = `import { 머리 } from './components/site-header.component.js';\n`;
    expect(skippable(po(`await new 머리(page).펼친다();`, '', head))[0]).toBe(true);
  });

  it.each([
    ['다른 파일의 도우미', `import { 로그인화면 } from './helpers.js';\n`],
    ['상위 폴더', `import { 로그인화면 } from '../pages/login.page.js';\n`],
    ['폴더를 거슬러 오름', `import { 로그인화면 } from './pages/../helpers.page.js';\n`],
    ['이름 꼴이 아님', `import { 로그인화면 } from './pages/Login.page.js';\n`],
  ])('Page Object 자리가 아닌 곳에서 가져온 클래스는 여전히 애매하다 — %s', (_, head) => {
    expect(skippable(po(`await new 로그인화면(page).열기();`, '', head))[0]).toBe(false);
  });

  it('절차 밖에서 만든 함수를 Page Object 에 넘기면 애매하다 — 그 안의 판정이 안 보인다', () => {
    const outside = `  const 판정 = async () => { await verify('숨은 판정', 1, 2); };\n  const 화면 = new 로그인화면(page);\n`;
    expect(skippable(po(`await 화면.열기(판정);`, outside))[0]).toBe(false);
  });

  it('같은 이름에 Page Object 말고 다른 것을 담는 선언이 하나라도 있으면 믿지 않는다', () => {
    const outside = `  let 화면 = new 로그인화면(page);\n  화면 = 도우미;\n`;
    expect(skippable(po(`await 화면.열기();`, outside))[0]).toBe(false);
    const twice = po(`await 화면.열기();`, `  const 화면 = new 로그인화면(page);\n`) +
      `\ntest(spec, async ({ page }) => {\n  const 화면 = 도우미(page);\n  await 화면.열기();\n});\n`;
    expect(skippable(twice)[0]).toBe(false);
  });

  it.each([
    ['verify 를 넘김', `await 화면.열기(verify);`],
    ['verify 를 옮겨 담아 넘김', `const v = verify;\n    await 화면.열기(v);`],
    ['test 를 넘김', `await 화면.열기(test);`],
    ['메서드 바꿔치기', `화면.열기 = async () => verify('숨은', 1, 2);\n    await 화면.열기();`],
    ['프로토타입 바꿔치기', `로그인화면.prototype.열기 = async () => {};\n    await 화면.열기();`],
    ['Object.assign', `Object.assign(화면, {});\n    await 화면.열기();`],
    ['인스턴스를 값으로 넘김', `await page.evaluate(화면);\n    await 화면.열기();`],
  ])('케이스가 판정 · Page Object 를 부르기 말고 다른 데 쓰면 믿지 않는다 — %s', (_, step) => {
    expect(skippable(po(step, `  const 화면 = new 로그인화면(page);\n`))[0]).toBe(false);
  });

  it('절차 밖에서 판정을 값으로 쓰면 그 파일의 Page Object 를 아무것도 믿지 않는다', () => {
    const outside = `  (globalThis as any).v = verify;\n  const 화면 = new 로그인화면(page);\n`;
    expect(skippable(po(`await 화면.열기();`, outside))[0]).toBe(false);
  });

  it('kit 을 통째로 가져온 파일은 Page Object 를 믿지 않는다', () => {
    const head = `import * as kit from '@platform/kit';\n${PAGE}`;
    expect(skippable(po(`await new 로그인화면(page).열기();`, '', head))[0]).toBe(false);
  });

  it('절차 밖에서 선언한 클래스를 넘겨도 애매하다', () => {
    const outside = `  class H { static f() { return verify('숨은', 1, 2); } }\n  const 화면 = new 로그인화면(page);\n`;
    expect(skippable(po(`await 화면.열기(H.f);`, outside))[0]).toBe(false);
  });

  it('클래스 이름을 다른 것으로 덮으면 믿지 않는다', () => {
    expect(skippable(po(`const 로그인화면 = 도우미;\n    await new 로그인화면(page).열기();`))[0]).toBe(false);
  });
});
