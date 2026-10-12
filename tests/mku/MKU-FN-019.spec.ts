import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-019',
  name: '화면을 79px 내리면 머리글이 화면 위에 붙지 않는다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
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

  await test.step('게시판 목록을 79px 내린다', async () => {
    await 목록.내리기(79);
    await verify('화면을 79px 내리면 머리글이 화면 위에 붙지 않는다', await 목록.머리글붙음.isVisible(), false);
  });

  await test.step('게시판 목록을 80px 내린다', async () => {
    await 목록.내리기(80);
    await verify('화면을 80px 내리면 머리글이 화면 위에 붙어 보인다', await 목록.머리글붙음.isVisible(), true);
  });
});
