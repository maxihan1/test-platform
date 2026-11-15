import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-108',
  name: '로그인 화면에 게임 계정의 아이디와 비밀번호를 넣으면 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다',
  precondition: ['로그인하지 않았다'],
  params: z.object({
    gameId: z.string().describe('게임 계정 아이디').optional().meta({ secret: true, account: '게임 계정' }),
    gamePassword: z.string().describe('게임 계정 비밀번호').optional().meta({ secret: true, account: '게임 계정' }),
  }),
  expected: z.object({
    문구: z.string().describe('로그인 실패 문구').default('아이디 또는 비밀번호가 맞지 않습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
    await verify('게임 계정 값이 채워져 있다', Boolean(params.gameId) && Boolean(params.gamePassword), true, { blocker: true });
  });

  await test.step('로그인 화면에 게임 계정의 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.gameId ?? '', params.gamePassword ?? '');
    await verify('로그인 화면에 게임 계정의 아이디와 비밀번호를 넣으면 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다', await 로그인.오류뜰때까지(), expected.문구);
  });
});
