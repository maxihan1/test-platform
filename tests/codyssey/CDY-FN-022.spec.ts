import { defineCase, test, verify } from '@platform/kit';

import { 교육과정화면 } from './pages/course.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-022',
  name: '둘째 「자세히 보기」를 누르면 새 창에 「AI 네이티브 과정」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['교육과정 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 교육과정 = new 교육과정화면(page);

  await test.step('교육과정 화면을 연다', async () => {
    await 교육과정.열기();
  });

  await test.step('교육과정 화면의 제목을 확인한다', async () => {
    const 제목보임 = await 교육과정.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육과정 화면에 제목 「교육과정」이 보인다', 제목보임, true, { blocker: true });
  });

  await test.step('둘째 「자세히 보기」를 누른다', async () => {
    const [새창] = await Promise.all([page.context().waitForEvent('page'), 교육과정.둘째자세히보기.click()]);

    const 제목보임 = await 교육과정
      .과정창제목(새창, 'AI 네이티브 과정')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('둘째 「자세히 보기」를 누르면 새 창에 「AI 네이티브 과정」 제목이 보인다', 제목보임, true);

    await 새창.close();
  });
});
