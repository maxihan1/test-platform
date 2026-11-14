import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이단계인증설정화면 } from './pages/otp-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-750',
  name: '2단계 인증 설정에서 틀린 코드를 넣으면 「코드가 올바르지 않습니다! 서버와 휴대전화 간의 시각이 일치하나요?」가 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    틀린코드: z.string().regex(/^\d{6}$/).describe('2단계 인증 설정에 넣을 코드 — 6자리 숫자 아무 값').default('000000'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 이단계인증설정화면(page);

  await test.step('두 번째 사용자로 로그인해 2단계 인증 설정을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기();
    await 설정.설정시작하기(params.secondPassword ?? '');
    await verify('2단계 인증 설정 화면에 「활성화」 버튼이 보인다', await 설정.활성화.isVisible(), true, { blocker: true });
  });

  await test.step('2단계 인증 설정에서 틀린 코드를 넣고 「활성화」를 누른다', async () => {
    await 설정.코드넣고활성화(params.틀린코드);
    const 떴다 = await 설정.오류안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('2단계 인증 설정에서 틀린 코드를 넣으면 「코드가 올바르지 않습니다! 서버와 휴대전화 간의 시각이 일치하나요?」가 보인다', 떴다, true);
  });
});
