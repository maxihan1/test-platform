import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-035',
  name: '너비 768px 화면의 머리글에 메뉴 대신 햄버거 버튼 하나가 보인다',
  platforms: ['desktop'],
  precondition: ['화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('너비 768px 화면으로 홈 화면을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 방해막기(page);
    await 홈.열기();
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
    const 메뉴칸 = await 머리.주메뉴.boundingBox();
    await verify(
      '너비 768px 화면의 머리글에 메뉴 대신 햄버거 버튼 하나가 보인다',
      { 햄버거수: await 머리.햄버거.count(), 햄버거보임: await 머리.햄버거.isVisible(), 메뉴는화면밖: 메뉴칸 !== null && 메뉴칸.x + 메뉴칸.width <= 0 },
      { 햄버거수: 1, 햄버거보임: true, 메뉴는화면밖: true },
    );
  });
});
