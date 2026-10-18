import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 읽지않은알림수 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-172',
  name: '남의 글에 댓글을 달면 글쓴이의 읽지 않은 알림 수가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글쓴이?: 글쓴이와글; 댓글쓴이?: 회원정보 } = {};
  const 댓글내용 = 고유글자('알림 확인 댓글');
  let 앞알림수 = -1;

  try {
    await test.step('새 회원이 글을 쓰고 다른 회원으로 로그인한다', async () => {
      준비.글쓴이 = await 글쓴이와글만들기(request, '알림 증가 확인');
      준비.댓글쓴이 = await 새회원으로로그인(page.request);
    });

    await test.step('글쓴이의 읽지 않은 알림 수를 확인한다', async () => {
      앞알림수 = await 읽지않은알림수(request);
      await verify('글쓴이의 읽지 않은 알림이 없다', 앞알림수, 0, { blocker: true });
    });

    await test.step('다른 회원으로 그 글에 댓글을 단다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글쓴이?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await 글.댓글등록하기(댓글내용);
      await 글.댓글줄(댓글내용).waitFor();
      await verify('남의 글에 댓글을 달면 글쓴이의 읽지 않은 알림 수가 1 오른다', (await 읽지않은알림수(request)) - 앞알림수, 1);
    });
  } finally {
    if (준비.댓글쓴이) await 회원정리(page.request, 준비.댓글쓴이);
    if (준비.글쓴이) await 글쓴이와글정리(request, 준비.글쓴이);
  }
});
