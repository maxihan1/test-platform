import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 내주문번호들 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-116',
  name: '주문 내역 위쪽에 기간 버튼 「1개월」 · 「3개월」 · 「전체」가 보인다',
  precondition: ['테스트 계정 회원으로 로그인해 있다', '테스트 계정은 주문 3건을 가지고 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 테스트계정값(params);
  const 화면 = new 주문내역화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 테스트 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('테스트 계정 회원으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await page.goto('/');
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
  });

  await test.step('테스트 계정이 가진 주문이 3건인지 확인한다', async () => {
    await verify('테스트 계정의 전체 주문이 3건이다', (await 내주문번호들(page.request)).length, 3, { blocker: true });
  });

  await test.step('주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await verify(
      '주문 내역 위쪽에 기간 버튼 「1개월」 · 「3개월」 · 「전체」가 보인다',
      [await 화면.기간버튼('1개월').isVisible(), await 화면.기간버튼('3개월').isVisible(), await 화면.기간버튼('전체').isVisible()],
      [true, true, true],
    );
    await verify('기간은 처음에 「3개월」이 눌려 있다', await 화면.기간버튼('3개월').getAttribute('aria-pressed'), 'true');
    const 줄들 = await 화면.주문줄읽기();
    await verify(
      '주문 줄마다 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다',
      줄들.length > 0 &&
        줄들.every(
          (줄) => /^\d{4}-\d{2}-\d{2}$/.test(줄.주문일) && 줄.주문번호 !== '' && 줄.상품명 !== '' && 줄.결제금액.endsWith('원') && 줄.상태 !== '',
        ),
      true,
    );
  });
});
