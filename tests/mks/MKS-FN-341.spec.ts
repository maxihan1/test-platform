import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-341',
  name: '맞는 글이 없는 검색을 하면 「검색 결과가 없습니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('커뮤니티 목록을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
  });

  await test.step('커뮤니티 목록이 열렸는지 확인한다', async () => {
    await verify('커뮤니티 목록 화면이 열려 있다', 경로(page), 게시판목록화면.주소, { blocker: true });
  });

  await test.step('커뮤니티 목록 검색 조건 「작성자」로 아무도 쓰지 않은 이름을 검색한다', async () => {
    await 목록.검색하기('작성자', 'zzzz없음');
    await verify('맞는 글이 없는 검색을 하면 「검색 결과가 없습니다」가 보인다', await 목록.결과없음.isVisible(), true);
  });
});
