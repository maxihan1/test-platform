import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 게시물지우기, 게시물채우기 } from './helpers/account-data.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정게시물화면 } from './pages/account-statuses.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-470',
  name: '게시물이 20건 넘는 계정의 계정 게시물 화면을 열면 첫 페이지에 게시물이 20건 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '게시물이 20건 넘는 시드 계정이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 게시 = new 계정게시물화면(page);
  let 사용자창: Awaited<ReturnType<typeof 새창으로로그인>> | undefined;
  let 글번호들: string[] = [];

  try {
    await test.step('역할이 없는 사용자 창으로 게시물을 21건 쓰고 Owner 계정으로 로그인한다', async () => {
      사용자창 = await 새창으로로그인(page, params.userId, params.userPassword);
      글번호들 = await 게시물채우기(사용자창, 21);
      await 로그인하기(page, params.loginId, params.loginPassword);
      await verify('게시물이 20건 넘는 시드 계정이 있다', 글번호들.length > 20, true, { blocker: true });
    });

    await test.step('게시물이 20건 넘는 계정의 계정 게시물 화면을 연다', async () => {
      await 게시.열기(await 계정번호(page, 'qa_user1'));
      await 게시.그려질때까지();
      await verify('게시물이 20건 넘는 계정의 계정 게시물 화면을 열면 첫 페이지에 게시물이 20건 보인다', await 게시.게시물행들.count(), 20);
    });
  } finally {
    if (사용자창 !== undefined) {
      try {
        await 게시물지우기(사용자창, 글번호들);
      } finally {
        await 사용자창.context().close();
      }
    }
  }
});
