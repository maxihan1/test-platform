import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 옵션상품번호 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-082',
  name: '옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」 가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('옵션 상품에서 옵션을 고르지 않고 「장바구니 담기」 를 누른다', async () => {
    await 상세.열기(옵션상품번호);
    await 상세.장바구니담기.click();
    await 알림.글('옵션을 선택하세요').first().waitFor();
    await verify('옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」 가 보인다', await 알림.글('옵션을 선택하세요').first().isVisible(), true);
  });
});
