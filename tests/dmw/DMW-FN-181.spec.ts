import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 화면제목 } from './components/page-heading.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-181',
  name: '다른 회원 글의 수정 주소를 열면 「권한이 없습니다」 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 제목 = new 화면제목(page);
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 다른 회원이 올린 글이 있는 게시판 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 계정으로로그인(page, params.loginId, params.loginPassword);
      await 안내창막기(page);
      await page.goto('/board');
      await 머리.그려질때까지();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('다른 회원이 쓴 글의 수정 주소를 연다', async () => {
      await page.goto(`/board/${글번호}/edit`);
      await 제목.글('권한이 없습니다').waitFor();
      const 안내 = await verify('「권한이 없습니다」 화면이 보인다', await 제목.글('권한이 없습니다').isVisible(), true);
      const 수정화면아님 = await verify('글 수정 화면이 보이지 않는다', await 쓰기.수정큰제목.count(), 0);
      await verify('다른 회원 글의 수정 주소를 열면 「권한이 없습니다」 화면이 보인다', 안내 && 수정화면아님, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
