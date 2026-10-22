import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-338',
  name: '로그인이 풀린 상태로 「장바구니」를 누르면 로그인 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['앱의 로그인이 밖에서 풀려 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 앱의 로그인을 밖에서 풀 길이 자료에 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);
  const 목록 = new 상품목록화면(driver);
  const 알림 = new 토스트(driver);

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, {
      blocker: true,
    });
  });

  await test.step('로그인이 풀린 상태로 「장바구니」를 누른다', async () => {
    await 목록.장바구니버튼.click();
    const 안내글 = await 알림.글();
    await 로그인.제목나올때까지();
    await verify('로그인이 풀린 상태로 「장바구니」를 누르면 로그인 화면으로 돌아간다', await 로그인.보이는가(), true);
    await verify('로그인이 풀린 상태로 「장바구니」를 누르면 토스트 「로그인이 필요합니다」가 보인다', 안내글, '로그인이 필요합니다');
  });
});
