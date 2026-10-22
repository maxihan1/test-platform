import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-027',
  name: '상품 목록에 분류 칩 「전체」 · 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 가로로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    const 칩글 = await verify(
      '분류 칩이 「전체」 · 「패션」 · 「전자기기」 · 「도서」 · 「식품」 차례로 보인다',
      (await 목록.분류칩글들()).join(' · '),
      '전체 · 패션 · 전자기기 · 도서 · 식품',
    );
    const 가로 = await verify('분류 칩이 한 줄에 왼쪽부터 차례로 놓인다', await 목록.칩이가로로놓였나(), true);
    await verify('상품 목록에 분류 칩 「전체」 · 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 가로로 보인다', 칩글 && 가로, true);
    await verify('상품 목록에 처음 골라진 분류 칩은 「전체」다', (await 목록.골라진칩들()).join(', '), '전체');
  });
});
