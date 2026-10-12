import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 화면오른쪽아래에있나 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-024',
  name: '게시판 목록을 한 화면 넘게 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 맨위로 = new 바닥글(page).맨위로;
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

  await test.step('게시판 목록을 한 화면 넘게 내린다', async () => {
    await 목록.내리기(450);
    await 맨위로.waitFor();
    await verify('게시판 목록을 한 화면 넘게 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다', await 화면오른쪽아래에있나(page, 맨위로), true);
  });
});
