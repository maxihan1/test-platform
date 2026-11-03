import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-431',
  name: '회원 아이디를 비우고 「만들기」를 누르면 만들지 않고 안내가 보인다',
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
  const 화면 = new 시험데이터화면(page);
  const 알림 = new 토스트(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 시험데이터화면.주소);
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await 화면.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('회원 아이디 칸을 비우고 결제완료 주문 칸에 1을 적은 뒤 「만들기」를 누른다', async () => {
    await 화면.만들기누르기('', { 결제완료: 1 });
    await 알림.목록.first().waitFor();
    const 안만듦 = await verify('만들었다는 결과가 보이지 않는다', await 화면.결과줄.getByText('만들었습니다', { exact: true }).isVisible(), false);
    const 안내 = await verify('「회원 아이디를 입력하세요」 안내가 보인다', await 알림.글자('회원 아이디를 입력하세요').isVisible(), true);
    await verify('회원 아이디를 비우고 「만들기」를 누르면 만들지 않고 안내가 보인다', 안만듦 && 안내, true);
  });
});
