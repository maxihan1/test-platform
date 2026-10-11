import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 안정될때까지읽기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-013',
  name: '햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다',
  platforms: ['desktop'],
  precondition: ['화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('너비 768px 화면에서 햄버거 버튼을 누른다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 방해막기(page);
    await 홈.열기();
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
    await verify('머리글에 햄버거 버튼이 보인다', await 머리.햄버거.isVisible(), true, { blocker: true });
    const 전 = await 머리.주메뉴.boundingBox();
    await 머리.햄버거.click();
    const 후 = await 안정될때까지읽기(() => 머리.주메뉴.boundingBox());
    await verify(
      '햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나온다',
      { 누르기전왼쪽밖: 전 !== null && 전.x + 전.width <= 0, 누른뒤왼쪽끝: 후 !== null && Math.round(후.x) === 0 },
      { 누르기전왼쪽밖: true, 누른뒤왼쪽끝: true },
    );
  });
});
