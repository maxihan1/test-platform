import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 계정상세읽기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-069',
  name: '유저 표의 이메일 칸에 qa_player2 의 이메일 전체가 가리지 않고 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 이메일 = '';

  await test.step('운영자 계정으로 로그인하고 대상 계정의 이메일을 읽어 둔다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    이메일 = (await 계정상세읽기(page, await 계정번호(page, 시험계정))).email;
  });

  await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
    await 화면.열기(`?q=${시험계정}`);
    await verify('대상 계정 줄이 보인다', await 화면.유저줄(시험계정).isVisible(), true, { blocker: true });
  });

  await test.step('qa_player2 줄의 이메일 칸을 본다', async () => {
    const 칸 = 화면.이메일칸(시험계정);
    const 전체 = await verify('이메일 칸에 이메일 전체가 보인다', (await 칸.innerText()).trim(), 이메일);
    const 안잘림 = await verify('이메일 칸의 글이 잘리지 않는다', await 화면.잘렸나(칸), false);
    await verify('유저 표의 이메일 칸에 qa_player2 의 이메일 전체가 가리지 않고 보인다', 전체 && 안잘림, true);
  });
});
