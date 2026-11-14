import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 기타환경설정화면 } from './pages/other-preferences.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-685',
  name: '설정에서 「변경 사항을 저장」을 누르면 「정상적으로 변경되었습니다!」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 기타환경설정화면(page);

  await test.step('일반 회원으로 로그인해 환경설정 「기타」를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 설정.열기();
    await verify('환경설정 「기타」 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('환경설정 「기타」에서 「변경 사항을 저장」을 누른다', async () => {
    await 설정.저장하기();
    const 떴다 = await 설정.저장안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('설정에서 「변경 사항을 저장」을 누르면 「정상적으로 변경되었습니다!」가 보인다', 떴다, true);
  });
});
