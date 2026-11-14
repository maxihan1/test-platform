import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-258',
  name: '계정 이동 화면에 「새 계정의 핸들」 · 「현재 암호 입력」 · 「팔로워 이동」이 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('두 번째 사용자로 로그인한다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
  });

  await test.step('계정 이동 화면을 연다', async () => {
    await 설정.열기('/settings/migration');
    const 핸들 = await verify('「새 계정의 핸들」 칸이 보인다', await 설정.칸('새 계정의 핸들').isVisible(), true);
    const 암호 = await verify('「현재 암호 입력」 칸이 보인다', await 설정.칸('현재 암호 입력').isVisible(), true);
    const 이동 = await verify('「팔로워 이동」 버튼이 보인다', await 설정.버튼('팔로워 이동').isVisible(), true);
    await verify('계정 이동 화면에 「새 계정의 핸들」 · 「현재 암호 입력」 · 「팔로워 이동」이 보인다', 핸들 && 암호 && 이동, true);
  });
});
