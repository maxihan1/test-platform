import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-089',
  name: '없는 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('없는 글 주소 /board/999999 를 연다', async () => {
    await 방해막기(page);
    await 상세.열기(999999);
    await 상세.그려질때까지();
    await verify('없는 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.isVisible(), true);
  });
});
