import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-160',
  name: '「알림 비우기」를 누르면 「알림을 모두 지울까요?」 확인 창이 뜬다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 알림 = new 알림머리말화면(page);

  await test.step('일반 회원으로 로그인하고 알림 설정을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 알림.열기();
    await 알림.설정열기();
    await verify('알림 설정에 「알림 비우기」가 보인다', await 알림.알림비우기.isVisible(), true, { blocker: true });
  });

  await test.step('알림 설정에서 「알림 비우기」를 누른다', async () => {
    await 알림.알림비우기.click();
    const 떴다 = await 알림.창.제목('알림을 모두 지울까요?').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「알림 비우기」를 누르면 「알림을 모두 지울까요?」 확인 창이 뜬다', 떴다, true);
    await 알림.창.버튼('취소').click();
    await 알림.창.닫힐때까지();
  });
});
