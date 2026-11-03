import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-255',
  name: '받는 회원 아이디를 비우고 보내면 「회원 아이디를 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 알림쿠폰화면(page);
  const 알림 = new 토스트(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 알림쿠폰화면.주소);
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await 화면.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('받는 회원 아이디를 비우고 「보내기」를 누른다', async () => {
    await 화면.알림보내기('', '시험 알림입니다');
    await 알림.목록.first().waitFor();
    await verify('받는 회원 아이디를 비우고 보내면 「회원 아이디를 입력하세요」가 보인다', await 알림.글자('회원 아이디를 입력하세요').isVisible(), true);
  });
});
