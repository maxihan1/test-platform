import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-003',
  name: '「커뮤니티」 메뉴에서 마우스를 치우면 하위 메뉴가 보이지 않는다',
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

  await test.step('홈을 열고 「커뮤니티」 메뉴에 마우스를 올린다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 머리.커뮤니티.hover();
  });

  await test.step('하위 메뉴가 열려 있는지 확인한다', async () => {
    await 머리.하위메뉴항목('자유게시판').waitFor();
    await verify('홈 화면에서 하위 메뉴가 보인다', 경로(page) === '/' && (await 머리.하위메뉴.isVisible()), true, { blocker: true });
  });

  await test.step('「커뮤니티」 메뉴에 올린 마우스를 메뉴 밖으로 치운다', async () => {
    await page.mouse.move(640, 600);
    await 머리.하위메뉴항목('자유게시판').waitFor({ state: 'hidden' });
    await verify('「커뮤니티」 메뉴에서 마우스를 치우면 하위 메뉴가 보이지 않는다', await 머리.하위메뉴.isVisible(), false);
  });
});
