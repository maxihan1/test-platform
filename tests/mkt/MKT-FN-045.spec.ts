import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-045',
  name: '잠긴 회원으로 로그인하면 잠금 안내가 보인다',
  precondition: ['비회원이다', '잠긴 회원 계정이 있다'],
  params: z.object({
    lockedId: z.string().min(1).describe('잠긴 회원 아이디').default('locked'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    message: z.string().describe('잠금 안내 문구').default('로그인 5회 실패로 10분간 로그인할 수 없습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('로그인 화면에서 잠긴 회원 아이디로 「로그인」을 누른다', async () => {
    await 화면.입력한다(params.lockedId, params.password ?? '');
    await 화면.로그인버튼.click();
    await 화면.로그인버튼.waitFor();
    await verify('잠긴 회원으로 로그인하면 잠금 안내가 보인다', await 화면.오류문구.innerText(), expected.message);
  });
});
