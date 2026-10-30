import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 회원번호 } from './helpers/ops-data.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-320',
  name: '모든 칸이 0이고 장바구니 칸이 비어 있으면 「만들 것을 하나 이상 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['관리자 계정으로 로그인해 있다', '관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    알림개수: z.number().int().describe('안 읽은 알림 칸에 적을 개수 — 1~5').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 시험데이터화면(page);
  const 알림 = new 토스트(page);
  let 회원: 일회용회원;

  await test.step('관리자 계정으로 로그인하고 일회용 회원을 만든다', async () => {
    회원 = await 회원가입(request);
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 시험데이터화면.주소);
  });

  await test.step('관리자 로그인과 일회용 회원을 확인한다', async () => {
    await 화면.그려질때까지();
    const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true);
    const 있음 = await verify('일회용 회원이 있다', (await 회원번호(page, 회원.loginId)) > 0, true);
    await verify('관리자 계정으로 로그인해 있고 일회용 회원이 있다', 로그인 && 있음, true, { blocker: true });
  });

  await test.step('주문 칸 넷을 0으로 두고 장바구니 칸을 비운 채 「만들기」를 누른다', async () => {
    await 화면.회원아이디.fill(회원.loginId);
    await 화면.만들기.click();
    await 알림.목록.first().waitFor();
    await verify(
      '모든 칸이 0이고 장바구니 칸이 비어 있으면 「만들 것을 하나 이상 입력하세요」가 보인다',
      await 알림.글자('만들 것을 하나 이상 입력하세요').isVisible(),
      true,
    );
  });

  await test.step('안 읽은 알림 칸에만 1을 적고 「만들기」를 누른다', async () => {
    await 알림.목록.first().waitFor({ state: 'detached' });
    await 화면.만들기누르기(회원.loginId, { 안읽은알림: params.알림개수 });
    await 알림.글자('님에게 시험 데이터를 만들었습니다').waitFor();
    await verify(
      '안 읽은 알림 칸만 1로 만들면 결과 줄에 「만들었습니다」가 보인다',
      await 화면.결과줄.getByText('만들었습니다', { exact: true }).isVisible(),
      true,
    );
  });
});
