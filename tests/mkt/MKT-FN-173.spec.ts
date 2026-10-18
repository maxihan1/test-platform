import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 읽지않은알림수 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-173',
  name: '자기 글에 단 댓글로는 글쓴이의 알림 수가 늘지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 글을 하나 썼다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('자기 글 댓글');
  let 앞알림수 = -1;

  try {
    await test.step('새 회원이 글을 쓴다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '자기 글 알림 확인');
    });

    await test.step('글쓴이의 읽지 않은 알림 수를 확인한다', async () => {
      앞알림수 = await 읽지않은알림수(page.request);
      await verify('글쓴이의 읽지 않은 알림이 없다', 앞알림수, 0, { blocker: true });
    });

    await test.step('글쓴 회원이 자기 글에 댓글을 단다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await 글.댓글등록하기(댓글내용);
      await 글.댓글줄(댓글내용).waitFor();
      await verify('자기 글에 단 댓글로는 글쓴이의 알림 수가 늘지 않는다', (await 읽지않은알림수(page.request)) - 앞알림수, 0);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});
