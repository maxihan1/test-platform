import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-147',
  name: '내가 쓴 댓글에는 「수정」 · 「삭제」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글에 댓글을 달아 둔다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 댓글달기(page.request, 글번호, '내가 쓴 댓글입니다');
    });

    await test.step('내가 댓글을 단 글 상세를 연다', async () => {
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('내가 쓴 댓글이 보인다', await 상세.댓글줄('내가 쓴 댓글입니다').count(), 1, { blocker: true });
      const 줄 = 상세.댓글줄('내가 쓴 댓글입니다');
      const 수정 = await verify('댓글의 「수정」이 보인다', await 상세.댓글수정버튼(줄).isVisible(), true);
      const 삭제 = await verify('댓글의 「삭제」가 보인다', await 상세.댓글삭제버튼(줄).isVisible(), true);
      await verify('내가 쓴 댓글에는 「수정」 · 「삭제」가 보인다', 수정 && 삭제, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
