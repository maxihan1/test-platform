import { defineCase, test, verify } from '@platform/kit';

import { 교육콘텐츠체험화면 } from './pages/demo.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-023',
  name: '「체험 시작하기 →」를 누르면 「STEP 1 / 6」이 보인다',
  platforms: ['desktop'],
  precondition: ['교육 콘텐츠 체험 화면이 열려 있다', '비회원이다', '체험 틀이 시작 화면이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 체험 = new 교육콘텐츠체험화면(page);

  await test.step('교육 콘텐츠 체험 화면을 연다', async () => {
    await 체험.열기();
  });

  await test.step('체험 틀의 시작 화면을 확인한다', async () => {
    const 시작보임 = await 체험.체험시작버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('체험 틀 안에 「체험 시작하기 →」 버튼이 보인다', 시작보임, true, { blocker: true });

    const 단계보임 = await 체험.첫단계표시.isVisible();
    await verify('체험 틀 안에 「STEP 1 / 6」이 보이지 않는다', 단계보임, false, { blocker: true });
  });

  await test.step('체험 틀 안에서 「체험 시작하기 →」를 누른다', async () => {
    await 체험.체험시작버튼.click();

    const 단계보임 = await 체험.첫단계표시
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('「체험 시작하기 →」를 누르면 「STEP 1 / 6」이 보인다', 단계보임, true);
  });
});
