import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-141',
  name: '비회원에게는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  let 글번호 = 0;

  try {
    await test.step('게시글 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('비회원으로 게시글 상세 댓글 자리를 확인한다', async () => {
      const 링크 = await verify('「댓글을 쓰려면 로그인하세요」 링크가 보인다', await 상세.로그인유도링크.isVisible(), true);
      const 입력칸없음 = await verify('댓글 입력칸이 보이지 않는다', await 상세.새댓글칸.count(), 0);
      await verify('비회원에게는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다', 링크 && 입력칸없음, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
