import { defineCase, test, verify } from '@platform/kit';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-174',
  name: '자기 글에 단 댓글은 알림 목록에 나오지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 글 = new 게시글화면(page);
  const 준비: { 글?: 글쓴이와글 } = {};
  const 댓글내용 = 고유글자('자기 글 알림 목록 댓글');

  try {
    await test.step('새 회원이 글을 쓴다', async () => {
      준비.글 = await 글쓴이와글만들기(page.request, '알림 목록 확인');
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 방해창막기(page);
      await 글.열기(준비.글?.글번호 ?? 0);
      await 글.댓글불러올때까지();
      await 글.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 글.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 준비.글?.제목, { blocker: true });
    });

    await test.step('자기 글에 댓글을 달고 알림 목록을 연다', async () => {
      await 글.댓글등록하기(댓글내용);
      await 글.댓글줄(댓글내용).waitFor();
      const 알림응답 = page.waitForResponse((응답) => 응답.url().includes('/api/notifications') && 응답.request().method() === 'GET');
      await 글.열기(준비.글?.글번호 ?? 0);
      await 알림응답;
      await 두프레임뒤(page);
      await 글.머리글.좁으면메뉴열기();
      await 글.머리글.알림종.click();
      await 글.머리글.알림목록.waitFor();
      await verify('자기 글에 단 댓글은 알림 목록에 나오지 않는다', await 글.머리글.알림목록.getByRole('link').count(), 0);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(page.request, 준비.글);
  }
});
