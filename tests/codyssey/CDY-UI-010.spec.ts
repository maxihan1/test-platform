import { defineCase, test, verify } from '@platform/kit';

import { 교육과정화면 } from './pages/course.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-010',
  name: '교육과정 화면에 제목, 구역 제목, 카드 제목, 「자세히 보기」 버튼이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 교육과정 = new 교육과정화면(page);

  await test.step('교육과정 화면을 연다', async () => {
    await 교육과정.열기();

    const 제목보임 = await 교육과정.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육과정 화면에 제목 「교육과정」이 보인다', 제목보임, true);

    const 교육안내보임 = await 교육과정.구역제목('교육안내')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육과정 화면에 「교육안내」 구역 제목이 보인다', 교육안내보임, true);

    const 올인원보임 = await 교육과정.카드제목('AI 올인원 과정')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육과정 화면에 「AI 올인원 과정」 카드 제목이 보인다', 올인원보임, true);

    const 네이티브보임 = await 교육과정.카드제목('AI 네이티브 과정')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육과정 화면에 「AI 네이티브 과정」 카드 제목이 보인다', 네이티브보임, true);

    await 교육과정.자세히보기버튼.last().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const 버튼수 = await 교육과정.자세히보기버튼.count();
    await verify('교육과정 화면에 「자세히 보기」 버튼이 둘 보인다', 버튼수, 2);
  });
});
