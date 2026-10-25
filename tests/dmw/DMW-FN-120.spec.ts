import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-120',
  name: '게시글 상세를 다시 열면 조회수가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  let 글번호 = 0;
  let 처음조회수 = 0;

  try {
    await test.step('게시글 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
      처음조회수 = await 상세.조회수읽기();
    });

    await test.step('게시글 상세를 다시 연다', async () => {
      await 상세.열기(글번호);
      await verify('게시글 상세를 다시 열면 조회수가 1 오른다', (await 상세.조회수읽기()) - 처음조회수, 1);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
