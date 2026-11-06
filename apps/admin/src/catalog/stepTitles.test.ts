// 스캔이 미리 저장할 단계 제목 — 꼭 한 번 도는 글자 제목만 세고 하나라도 못 세면 null 이다 (카탈로그 §3.1 「단계 제목」)

import { describe, expect, it } from 'vitest';

import { caseSteps } from './steps.js';

function body(inner: string): string {
  return `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'DEMO-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
${inner}
});
`;
}

const 제목 = (inner: string): string[] | null => caseSteps(body(inner)).stepTitles;

describe('caseSteps — stepTitles', () => {
  it('도는 차례대로 제목을 낸다 — 안쪽 절차는 바깥 절차 바로 뒤다(러너 seq 차례)', () => {
    expect(
      제목(`
  await test.step('로그인 화면을 연다', async () => { await page.goto('/login'); });
  await test.step('로그인한다', async () => {
    await test.step('아이디를 넣는다', async () => { await page.getByRole('textbox').fill('a'); });
  });
  await test.step('첫 화면을 확인한다', async () => { await verify('보인다', 1, 1); });
`),
    ).toEqual(['로그인 화면을 연다', '로그인한다', '아이디를 넣는다', '첫 화면을 확인한다']);
  });

  it('절차가 없는 케이스는 빈 목록이다 — 못 센 null 과 가른다', () => {
    expect(제목(`  await page.goto('/');`)).toEqual([]);
  });

  it('도우미를 부르는 절차도 센다 — 판정을 숨기는지는 단계 수와 상관없다', () => {
    expect(제목(`  await test.step('연다', async () => { await 열기(page); });`)).toEqual(['연다']);
  });

  it.each([
    ['반복문', `  for (const x of [1, 2]) { await test.step('누른다', async () => { await page.click('a'); }); }`],
    ['if', `  if (page.url()) { await test.step('누른다', async () => { await page.click('a'); }); }`],
    ['삼항', `  page.url() ? await test.step('누른다', async () => {}) : undefined;`],
    ['&&', `  page.url() && (await test.step('누른다', async () => {}));`],
    ['catch', `  try { await page.click('a'); } catch { await test.step('누른다', async () => {}); }`],
    ['switch', `  switch (page.url()) { case '/': await test.step('누른다', async () => {}); }`],
    ['도우미 함수 안', `  const 누르기 = async () => { await test.step('누른다', async () => {}); };\n  await 누르기();`],
    ['변수 제목', `  const t = '누른다';\n  await test.step(t, async () => {});`],
    ['템플릿 식 제목', '  await test.step(`${1}번 누른다`, async () => {});'],
    ['이름으로 넘긴 본문', `  const 몸 = async () => {};\n  await test.step('누른다', 몸);`],
  ])('%s 안의 절차가 하나라도 있으면 null 이다', (_, inner) => {
    expect(제목(`  await test.step('연다', async () => { await page.goto('/'); });\n${inner}`)).toBeNull();
  });

  it('절차 안의 if 안에 든 안쪽 절차도 null 이다', () => {
    expect(
      제목(`  await test.step('연다', async () => {
    if (page.url()) await test.step('닫는다', async () => {});
  });`),
    ).toBeNull();
  });
});
