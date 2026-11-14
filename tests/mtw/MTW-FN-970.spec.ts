import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-970',
  name: '알림이 없을 때 알림 화면을 열면 「아직 알림이 없습니다. 다른 사람들이 당신에게 반응했을 때, 여기에서 볼 수 있습니다.」가 보인다',
  precondition: ['알림 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 알림 = new 알림머리말화면(page);
  const 풀기들: 풀기[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  try {
    await test.step('알림이 없을 때 알림 화면을 연다', async () => {
      풀기들.push(await 가짜응답(page, /\/api\/v2\/notifications(\?|$)/, { 본문: { accounts: [], statuses: [], notification_groups: [] } }));
      풀기들.push(await 가짜응답(page, /\/api\/v1\/notifications(\?|$)/, { 본문: [] }));
      await 알림.열기();
      const 떴다 = await 알림.안내('아직 알림이 없습니다. 다른 사람들이 당신에게 반응했을 때, 여기에서 볼 수 있습니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('알림이 없을 때 알림 화면을 열면 「아직 알림이 없습니다. 다른 사람들이 당신에게 반응했을 때, 여기에서 볼 수 있습니다.」가 보인다', 떴다, true);
    });
  } finally {
    for (const 풀 of 풀기들) await 풀();
  }
});
