import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-043',
  name: '배너 아래에 「인기글」 · 「최신글」 탭이 보이고 「인기글」이 골라져 있다',
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

  await test.step('홈 화면의 게시글 탭을 확인한다', async () => {
    await verify(
      '배너 아래에 「인기글」 · 「최신글」 탭이 보이고 「인기글」이 골라져 있다',
      {
        인기글: await 홈.인기글탭.isVisible(),
        최신글: await 홈.최신글탭.isVisible(),
        인기글선택: await 홈.인기글탭.getAttribute('aria-selected'),
        최신글선택: await 홈.최신글탭.getAttribute('aria-selected'),
      },
      { 인기글: true, 최신글: true, 인기글선택: 'true', 최신글선택: 'false' },
    );
  });
});
