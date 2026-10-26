import { defineCase, test, verify } from '@platform/kit';

import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-105',
  name: '게시글 상세 아래에 「댓글 <개수>」 제목과 댓글마다 작성자 · 작성 시각 · 내용이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  let 글번호 = 0;

  try {
    await test.step('댓글이 둘 달린 게시글 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 댓글달기(request, 글번호, '첫째 댓글입니다');
      await 댓글달기(request, 글번호, '둘째 댓글입니다');
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await verify('댓글이 둘 보인다', await 상세.댓글줄들.count(), 2, { blocker: true });
    });

    await test.step('댓글이 있는 게시글 상세 아래를 확인한다', async () => {
      const 제목 = await verify('댓글 제목이 「댓글 2」로 보인다', await 상세.댓글제목.innerText(), '댓글 2');
      const 빠진것: string[] = [];
      const 줄들 = await 상세.댓글줄들.all();
      for (const [차례, 줄] of 줄들.entries()) {
        if (!(await 줄.locator('.who').isVisible())) 빠진것.push(`${차례 + 1}번째 작성자`);
        if (!(await 줄.locator('.when').isVisible())) 빠진것.push(`${차례 + 1}번째 작성 시각`);
        if (!(await 줄.locator('.text').isVisible())) 빠진것.push(`${차례 + 1}번째 내용`);
      }
      const 칸들 = await verify('댓글마다 작성자 · 작성 시각 · 내용이 보인다', 빠진것, []);
      await verify('게시글 상세 아래에 「댓글 <개수>」 제목과 댓글마다 작성자 · 작성 시각 · 내용이 보인다', 제목 && 칸들, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
