import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-152',
  name: '답글이 없는 댓글을 지우면 댓글 목록에서 사라진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 댓글 둘과 답글 하나를 단 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 댓글달기(page.request, 글번호, '답글이 없는 내 댓글입니다');
      const 댓글번호 = await 댓글달기(page.request, 글번호, '답글이 하나 달릴 내 댓글입니다');
      await 댓글달기(page.request, 글번호, '댓글에 단 답글 하나입니다', 댓글번호);
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글 둘과 답글 하나가 보인다', await 상세.댓글줄들.count(), 3, { blocker: true });
    });

    await test.step('답글이 없는 내 댓글을 지운다', async () => {
      await 상세.댓글삭제버튼(상세.댓글줄('답글이 없는 내 댓글입니다')).click();
      await 상세.댓글수가될때까지(2);
      await verify('답글이 없는 댓글을 지우면 댓글 목록에서 사라진다', await 상세.댓글줄('답글이 없는 내 댓글입니다').count(), 0);
    });

    await test.step('답글이 하나 달린 내 댓글을 지운다', async () => {
      await 상세.댓글삭제버튼(상세.댓글줄('답글이 하나 달릴 내 댓글입니다')).click();
      await 상세.댓글수가될때까지(1);
      await verify('답글이 하나 있는 댓글을 지우면 댓글 자리가 목록에서 사라지지 않는다', await 상세.댓글줄('삭제된 댓글입니다').count(), 1);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
