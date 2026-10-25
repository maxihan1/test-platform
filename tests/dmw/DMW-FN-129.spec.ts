import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-129',
  name: '다른 회원이 쓴 글 상세에는 「수정」 · 「삭제」가 보이지 않는다',
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
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 다른 회원이 올린 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 계정으로로그인(page, params.loginId, params.loginPassword);
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 머리.그려질때까지();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('다른 회원이 쓴 글 상세를 연다', async () => {
      await 상세.댓글그려질때까지();
      const 수정 = await verify('「수정」이 보이지 않는다', await 상세.수정.isVisible(), false);
      const 삭제 = await verify('「삭제」가 보이지 않는다', await 상세.삭제.isVisible(), false);
      await verify('다른 회원이 쓴 글 상세에는 「수정」 · 「삭제」가 보이지 않는다', 수정 && 삭제, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
