import { defineCase, test, verify } from '@platform/kit';
import { 교육과정화면 } from './pages/course.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-021',
  name: '교육과정 화면에서 「AI 올인원 과정」의 「자세히 보기」를 누르면 새 창이 열린다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 교육과정화면(page);

  await test.step('교육과정 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('교육과정 화면의 「AI 올인원 과정」 「자세히 보기」 버튼을 확인한다', async () => {
    await 화면.제목.waitFor();
    await verify('교육과정 화면에 「AI 올인원 과정」의 「자세히 보기」 버튼이 보인다', await 화면.올인원자세히보기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('교육과정 화면에서 「AI 올인원 과정」의 「자세히 보기」를 누른다', async () => {
    const 새창 = page.waitForEvent('popup');
    await 화면.자세히보기를누른다();
    const 새창화면 = await 새창;
    await 새창화면.waitForLoadState();
    await verify(
      '교육과정 화면에서 「AI 올인원 과정」의 「자세히 보기」를 누르면 새 창이 열린다',
      new URL(새창화면.url()).pathname,
      '/apply/course-popup-1',
    );
  });
});
