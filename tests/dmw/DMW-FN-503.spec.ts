import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-503',
  name: '댓글 「등록」을 빠르게 두 번 누르면 댓글이 하나만 생긴다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('댓글이 하나도 없다', await 상세.댓글수읽기(), 0, { blocker: true });
    });

    await test.step('댓글 「등록」을 빠르게 두 번 누른다', async () => {
      await 상세.새댓글칸.fill('빠르게 두 번 눌러 등록하는 댓글입니다');
      await 보낸요청끝날때까지(page, async () => {
        await 상세.새댓글등록.dblclick();
      });
      const 응답 = await page.request.get(`/api/posts/${글번호}/comments`);
      const 개수 = ((await 응답.json()) as { items: unknown[] }).items.length;
      await verify('댓글 「등록」을 빠르게 두 번 누르면 댓글이 하나만 생긴다', 개수, 1);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
