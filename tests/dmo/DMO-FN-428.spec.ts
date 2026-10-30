import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-428',
  name: '알림 「보내기」 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다', '알림 「보내기」 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 알림쿠폰화면(page);
  const 알림 = new 토스트(page);
  let 회원: 일회용회원;

  await test.step('관리자 계정으로 로그인하고 일회용 회원을 만든다', async () => {
    회원 = await 회원가입(request);
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 알림쿠폰화면.주소);
  });

  await test.step('관리자 로그인과 일회용 회원을 확인한다', async () => {
    await 화면.그려질때까지();
    const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
    const 있음 = await verify('일회용 회원이 있다', (await 회원번호(page, 회원.loginId)) > 0, true);
    await verify('관리자 계정으로 로그인해 있고 일회용 회원이 있다', 로그인 && 있음, true, { blocker: true });
  });

  await test.step('보내기 응답이 실패하는 채로 「보내기」를 누른다', async () => {
    await page.context().route('**/api/ops/notifications', (경로) =>
      경로.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    try {
      await 화면.알림보내기(회원.loginId, '시험 알림입니다');
      await 알림.목록.first().waitFor();
      const 화면그대로 = await verify('화면이 깨지지 않는다', await 화면.알림폼.isVisible(), true);
      const 오류안내 = await verify(
        '오류 안내 토스트가 보인다',
        await 알림.목록.filter({ hasNotText: '알림을 보냈습니다' }).first().isVisible(),
        true,
      );
      await verify('알림 「보내기」 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다', 화면그대로 && 오류안내, true);
    } finally {
      await page.context().unroute('**/api/ops/notifications');
    }
  });
});
