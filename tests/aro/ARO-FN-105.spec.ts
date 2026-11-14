import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-105',
  name: '없는 아이디로 로그인하면 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['로그인하지 않았다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  let 없는아이디상태 = 0;
  let 틀린비밀번호상태 = 0;

  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
  });

  await test.step('없는 아이디로 로그인한다', async () => {
    없는아이디상태 = await 로그인.로그인하고응답받기('zz_no_user_' + String(Date.now()), '시험용 비밀번호');
    await verify('없는 아이디로 로그인하면 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다', await 로그인.오류뜰때까지(), '아이디 또는 비밀번호가 맞지 않습니다');
  });

  await test.step('운영자 아이디에 틀린 비밀번호로 로그인한다', async () => {
    틀린비밀번호상태 = await 로그인.로그인하고응답받기(params.loginId ?? '', (params.loginPassword ?? '') + '_틀림');
    await verify('틀린 비밀번호에도 같은 문구 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다', await 로그인.오류뜰때까지(), '아이디 또는 비밀번호가 맞지 않습니다');
  });

  await test.step('로그인 응답 코드를 확인한다', async () => {
    const 없는아이디 = await verify('없는 아이디로 낸 로그인의 응답 코드는 401 이다', 없는아이디상태, 401);
    const 틀린비밀번호 = await verify('틀린 비밀번호로 낸 로그인의 응답 코드는 401 이다', 틀린비밀번호상태, 401);
    await verify('틀린 로그인의 응답 코드는 401 이다', 없는아이디 && 틀린비밀번호, true);
  });
});
