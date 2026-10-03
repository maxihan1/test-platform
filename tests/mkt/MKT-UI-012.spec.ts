import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-012',
  name: '아이디와 비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    enabled: z.boolean().describe('「로그인」 버튼이 눌리는지').default(false),
  }),
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
    await verify('아이디와 비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 화면.로그인버튼.isEnabled(), expected.enabled);
  });
});
