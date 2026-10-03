import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-037',
  name: '이름에 1자를 적으면 「이름은 2~10자입니다」가 보인다',
  precondition: ['비회원이다', '회원가입 화면이 열려 있다'],
  unconfirmed: '기획서와 다름 — 차이 D4: 이름 칸 규칙 문구가 기획서에 없고 화면에만 있다 (작성 요청 5873)',
  params: z.object({
    input: z.string().min(1).describe('적을 값').default('가'),
  }),
  expected: z.object({
    message: z.string().describe('안내 문구').default('이름은 2~10자입니다'),
    shown: z.boolean().describe('문구가 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('이름 칸에 1자를 적는다', async () => {
    await 화면.이름.fill(params.input);
    await verify('이름에 1자를 적으면 「이름은 2~10자입니다」가 보인다', await 화면.문구(expected.message).isVisible(), expected.shown);
  });
});
