import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-526',
  name: '「서버 설명」 칸에 201자를 넣으면 200자까지만 들어간다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 설정 = new 서버설정화면(page);

  await test.step('Owner 계정으로 로그인해 「브랜딩」 탭을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 설정.열기('branding');
    await verify('「서버 설명」 칸이 보인다', await 설정.서버설명.isVisible(), true, { blocker: true });
  });

  await test.step('「서버 설명」 칸에 201자를 넣는다', async () => {
    await 설정.서버설명.fill('가'.repeat(201));
    await verify('「서버 설명」 칸에 201자를 넣으면 200자까지만 들어간다', (await 설정.서버설명.inputValue()).length, 200);
  });
});
