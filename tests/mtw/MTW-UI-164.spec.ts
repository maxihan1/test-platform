import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-164',
  name: '로그인 후 유행 중 「사람들」 탭에 「팔로우할 만한 사람」 카드가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 유행 = new 유행중화면(page);

  await test.step('일반 회원으로 로그인하고 유행 중을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 유행.열기();
    await verify('유행 중 화면에 「사람들」 탭이 보인다', await 유행.사람들탭.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 후 유행 중 「사람들」 탭을 연다', async () => {
    await 유행.사람들탭.click();
    const 떴다 = await 유행.영역글('팔로우할 만한 사람').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('로그인 후 유행 중 「사람들」 탭에 「팔로우할 만한 사람」 카드가 보인다', 떴다, true);
  });
});
