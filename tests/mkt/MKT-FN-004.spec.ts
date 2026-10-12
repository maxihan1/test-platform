import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-004',
  name: '하위 메뉴 「질문게시판」을 누르면 게시판 목록에 「질문」 탭이 선택되어 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('홈 화면을 연다', async () => {
    await page.goto('/');
  });

  await test.step('머리글 메뉴가 보이는지 확인한다', async () => {
    await 머리.커뮤니티.waitFor();
    await verify('머리글 「커뮤니티」 메뉴가 보인다', await 머리.커뮤니티.isVisible(), true, { blocker: true });
  });

  await test.step('하위 메뉴 「질문게시판」을 누른다', async () => {
    await 머리.커뮤니티.hover();
    await 머리.하위메뉴항목('질문게시판').click();
    await 목록.그려질때까지();
    await verify('하위 메뉴 「질문게시판」을 누르면 게시판 목록에 「질문」 탭이 선택되어 보인다', await 목록.선택된분류탭('질문').isVisible(), true);
  });
});
