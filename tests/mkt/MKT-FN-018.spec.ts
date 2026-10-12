import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-018',
  name: '「맨 위로」를 누르면 화면이 맨 위로 올라간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 맨위로 = new 바닥글(page).맨위로;
  const 머리 = new 머리글(page);
  await 방해막기(page);

  await test.step('화면 높이를 400px 로 줄인다', async () => {
    await page.setViewportSize({ width: 1280, height: 400 });
  });

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록을 한 화면 넘게 내린 뒤 「맨 위로」를 누른다', async () => {
    await 머리.그려질때까지();
    await 목록.내리기(450);
    await 맨위로.click();
    await 맨위로.waitFor({ state: 'hidden' });
    await page.waitForTimeout(600);
    await verify('「맨 위로」를 누르면 화면이 맨 위로 올라간다', await 목록.내린만큼(), 0);
  });
});
