import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문대표상품명, 한달전날짜 } from './components/member-helpers.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-346',
  name: '기간 「전체」를 누르면 주문 3건이 최신순으로 보인다',
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

  await test.step('주문 내역에서 「전체」를 누른다', async () => {
    await 화면.열기();
    await 화면.기간누르기('전체');
    await 화면.주문줄들.first().waitFor();
    const 줄들 = await 화면.주문줄읽기();
    await verify(
      '기간 「전체」를 누르면 주문 3건이 최신순으로 보인다',
      { 건수: 줄들.length, 최신순: 줄들.every((줄, i) => i === 0 || (줄들[i - 1]?.주문일 ?? '') >= 줄.주문일) },
      { 건수: 3, 최신순: true },
    );
    const 기대 = await Promise.all(줄들.map((줄) => 주문대표상품명(page.request, 줄.주문번호)));
    await verify('상품이 여러 개인 주문의 대표 상품명 뒤에 「외 {N}건」이 붙는다', 줄들.map((줄) => 줄.상품명), 기대);
  });

  await test.step('주문 내역에서 「1개월」을 누른다', async () => {
    await 화면.기간누르기('1개월');
    await 화면.주문줄들.first().waitFor();
    const 줄들 = await 화면.주문줄읽기();
    await verify('「1개월」을 누르면 주문일이 한 달 안인 주문만 보인다', 줄들.length > 0 && 줄들.every((줄) => 줄.주문일 >= 한달전날짜()), true);
  });
});
