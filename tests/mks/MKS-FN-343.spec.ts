import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-343',
  name: '없는 번호로 게시글 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('없는 번호 「999999」로 게시글 상세를 연다', async () => {
    await 방해막기(page);
    await 상세.열기(999999);
    await 상세.목록링크.waitFor();
    await verify('없는 번호로 게시글 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.isVisible(), true);
  });
});
