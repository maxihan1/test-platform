import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-146',
  name: '답글에는 「답글」 버튼이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '상태 전이'],
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글에 댓글과 답글을 달고 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      const 댓글번호 = await 댓글달기(page.request, 글번호, '답글이 달릴 댓글입니다');
      await 댓글달기(page.request, 글번호, '댓글에 단 답글입니다', 댓글번호);
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글에는 「답글」 버튼이 보인다', await 상세.답글버튼(상세.댓글줄('답글이 달릴 댓글입니다')).isVisible(), true, { blocker: true });
    });

    await test.step('답글이 달린 댓글을 확인한다', async () => {
      await verify('답글에는 「답글」 버튼이 보이지 않는다', await 상세.답글버튼(상세.댓글줄('댓글에 단 답글입니다')).isVisible(), false);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
