import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-429',
  name: '쿠폰 받는 회원 아이디를 비우고 「주기」를 누르면 쿠폰을 주지 않고 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
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

  await test.step('쿠폰 받는 회원 아이디를 비우고 「주기」를 누른다', async () => {
    await 화면.쿠폰주기('', 5000, 0);
    await 알림.목록.first().waitFor();
    const 안줌 = await verify('쿠폰을 줬다는 안내가 뜨지 않는다', await 알림.글자('쿠폰을 줬습니다').isVisible(), false);
    const 안내 = await verify('「회원 아이디를 입력하세요」 안내가 보인다', await 알림.글자('회원 아이디를 입력하세요').isVisible(), true);
    await verify('쿠폰 받는 회원 아이디를 비우고 「주기」를 누르면 쿠폰을 주지 않고 안내가 보인다', 안줌 && 안내, true);
  });
});
