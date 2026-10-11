import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 몇달전날짜 } from './helpers/member.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-106',
  name: '기간 「전체」 를 누르면 3개월보다 오래된 주문까지 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 주문내역화면(page);
  const 상세 = new 주문상세화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역 기간에서 「전체」 를 누른다', async () => {
    const 석달전 = 몇달전날짜(3);
    await 목록.열기();
    await verify('기본 기간 「3개월」 에는 3개월보다 오래된 주문이 보이지 않는다', (await 목록.날짜들()).some((날짜) => 날짜 < 석달전), false, { blocker: true });
    await 목록.기간누르기('전체');
    await verify('기간 「전체」 를 누르면 3개월보다 오래된 주문까지 보인다', (await 목록.날짜들()).some((날짜) => 날짜 < 석달전), true);
  });

  await test.step('주문 내역 기간에서 「1개월」 을 누른다', async () => {
    const 한달전 = 몇달전날짜(1);
    await 목록.기간누르기('1개월');
    const 날짜 = await 목록.날짜들();
    await verify('기간 「1개월」 을 누르면 한 달 안의 주문만 보인다', { 한건이상: 날짜.length > 0, 모두한달안: 날짜.every((칸) => 칸 >= 한달전) }, { 한건이상: true, 모두한달안: true });
  });

  await test.step('주문 내역에서 주문 한 줄을 누른다', async () => {
    const 번호 = await 목록.줄의주문번호(0);
    await 목록.줄누르기(0);
    await 상세.상태배지.waitFor();
    await verify('주문 내역에서 주문을 누르면 그 주문 상세 화면으로 간다', { 제목: await 상세.제목.isVisible(), 주문번호: await 상세.주문번호값.innerText() }, { 제목: true, 주문번호: 번호 });
  });
});
