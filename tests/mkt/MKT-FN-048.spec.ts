import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-048',
  name: '「인기글」 탭에 글 5건이 좋아요 많은 순으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('「인기글」 탭의 글 목록을 확인한다', async () => {
    const 좋아요들 = (await 홈.글들()).map((글) => 글.좋아요);
    await verify(
      '「인기글」 탭에 글 5건이 좋아요 많은 순으로 보인다',
      { 건수: 좋아요들.length, 많은순: 좋아요들.every((수, 순서) => 순서 === 0 || (좋아요들[순서 - 1] ?? 0) >= 수) },
      { 건수: 5, 많은순: true },
    );
  });
});
