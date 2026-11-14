import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-159',
  name: '알림 머리말에 「걸러진 알림」 아이콘 · 「모든 알림을 읽은 상태로 표시」 · 설정 버튼이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 알림 = new 알림머리말화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('알림 화면을 연다', async () => {
    await 알림.열기();
    const 모두보임 = await 알림.빠른필터('모두').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 걸러진 = await verify('「걸러진 알림」 아이콘이 보인다', await 알림.걸러진알림.first().isVisible(), true);
    const 읽음 = await verify('「모든 알림을 읽은 상태로 표시」가 보인다', await 알림.모두읽음.isVisible(), true);
    const 설정 = await verify('알림 머리말에 설정 버튼이 보인다', await 알림.설정버튼.isVisible(), true);
    await verify('알림 머리말에 「걸러진 알림」 아이콘 · 「모든 알림을 읽은 상태로 표시」 · 설정 버튼이 보인다', 걸러진 && 읽음 && 설정, true);
    const 모두 = await verify('빠른 필터 「모두」가 보인다', 모두보임, true);
    const 멘션 = await verify('빠른 필터 「멘션」이 보인다', await 알림.빠른필터('멘션').isVisible(), true);
    await verify('빠른 필터 「모두」 · 「멘션」이 보인다', 모두 && 멘션, true);
  });
});
