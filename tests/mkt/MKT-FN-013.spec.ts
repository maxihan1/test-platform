import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 화면아래가운데에있나 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-013',
  name: '게시판에서 한 글자로 검색하면 토스트가 화면 아래 가운데에 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 한 글자로 검색한다', async () => {
    await 목록.검색어.fill('가');
    await 목록.검색.click();
    await 알림.알림들.first().waitFor();
    await verify('게시판에서 한 글자로 검색하면 토스트가 화면 아래 가운데에 보인다', await 화면아래가운데에있나(page, 알림.알림들.first()), true);
  });
});
