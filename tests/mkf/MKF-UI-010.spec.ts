import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 화면안에있나 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-010',
  name: '너비 768px 홈 머리글에 메뉴 대신 햄버거 버튼 하나가 보인다',
  precondition: ['화면 너비가 768px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);

  await test.step('화면 너비를 768px 로 맞춘다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
  });

  await test.step('화면 너비가 768px 인지 확인한다', async () => {
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 머리.햄버거.waitFor();
    await verify(
      '너비 768px 홈 머리글에 메뉴 대신 햄버거 버튼 하나가 보인다',
      {
        햄버거버튼: await 머리.햄버거.isVisible(),
        메뉴가화면안에보임: (await 화면안에있나(머리.커뮤니티)) || (await 화면안에있나(머리.쇼핑)) || (await 화면안에있나(머리.고객센터)),
      },
      { 햄버거버튼: true, 메뉴가화면안에보임: false },
    );
  });
});
