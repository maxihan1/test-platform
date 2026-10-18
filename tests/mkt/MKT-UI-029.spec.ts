import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-029',
  name: '너비 768px 이하에서는 머리글 메뉴 대신 햄버거 버튼 하나만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('너비 768px 로 홈 화면을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 방해창막기(page);
    await 홈.열기();
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
    await verify(
      '너비 768px 이하에서는 머리글 메뉴 대신 햄버거 버튼 하나만 보인다',
      { 햄버거: await 홈.머리글.햄버거.isVisible(), 메뉴는화면밖: await 홈.머리글메뉴가화면밖인가() },
      { 햄버거: true, 메뉴는화면밖: true },
    );
  });
});
