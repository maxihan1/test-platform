import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 세션아이디, 화면안에있나 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-025',
  name: '너비 768px 화면에서 햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나와 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('너비 768px 화면으로 홈을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 방해막기(page);
    await 홈.열기();
  });

  await test.step('햄버거 버튼이 보이고 메뉴가 왼쪽 밖에 접혀 있는지 확인한다', async () => {
    await 머리.햄버거.waitFor();
    const 칸 = await 머리.커뮤니티.boundingBox();
    await verify(
      '햄버거 버튼이 보이고 메뉴가 화면 왼쪽 밖에 있다',
      { 햄버거버튼: await 머리.햄버거.isVisible(), 메뉴가왼쪽밖: 칸 !== null && 칸.x + 칸.width <= 0 },
      { 햄버거버튼: true, 메뉴가왼쪽밖: true },
      { blocker: true },
    );
  });

  await test.step('너비 768px 화면에서 햄버거 버튼을 누른다', async () => {
    await 머리.햄버거.click();
    await verify(
      '너비 768px 화면에서 햄버거 버튼을 누르면 메뉴가 왼쪽에서 밀려 나와 보인다',
      await 화면안에있나(머리.커뮤니티, 2000),
      true,
    );
  });
});
