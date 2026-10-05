import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문목록가짜로바꾸기 } from './components/member-helpers.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-178',
  name: '주문 상태 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」가 서로 다른 색으로 보인다',
  precondition: ['테스트 계정 회원으로 로그인해 있다', '주문 목록 응답은 가짜 응답(모킹)이다 — 네 상태 주문'],
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
  const 되돌리기 = await 주문목록가짜로바꾸기(page.context());

  try {
    await test.step('로그인 요청으로 테스트 계정에 로그인한다', async () => {
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('테스트 계정 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('주문 내역 화면을 연다', async () => {
      await 화면.열기();
      await verify('주문 내역에 네 상태 주문이 보인다', (await 화면.주문줄읽기()).map((줄) => 줄.상태), ['결제완료', '배송중', '배송완료', '주문취소'], { blocker: true });
      const 색들 = [
        await 화면.상태글자색('결제완료'),
        await 화면.상태글자색('배송중'),
        await 화면.상태글자색('배송완료'),
        await 화면.상태글자색('주문취소'),
      ];
      await verify('주문 상태 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」가 서로 다른 색으로 보인다', new Set(색들).size, 4);
    });
  } finally {
    await 되돌리기();
  }
});
