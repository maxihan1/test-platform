import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 주문만들기, 둘째회원만들기, 둘째회원정리 } from './helpers/order-tools.helper.js';
import type { 둘째회원 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-240',
  name: '다른 회원의 주문 번호로 주문 상세를 열면 「권한이 없습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['다른 회원의 주문이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 둘째!: 둘째회원;
  let 둘째주문번호 = '';
  let 정보: 회원정보 | undefined;
  const 상세 = new 내주문상세화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('다른 회원이 주문을 하나 만든다', async () => {
      둘째 = await 둘째회원만들기();
      둘째주문번호 = (await 주문만들기(둘째.api)).주문번호;
    });

    await test.step('다른 회원의 주문이 있는지 확인한다', async () => {
      await verify('다른 회원의 주문이 하나 있다', (await 둘째.api.get('/api/orders/' + encodeURIComponent(둘째주문번호))).ok(), true, { blocker: true });
    });

    await test.step('그 주문 번호로 주문 상세를 연다', async () => {
      await 상세.열기(둘째주문번호);
      await 상세.주문내역으로.waitFor();
      await verify('다른 회원의 주문 번호로 주문 상세를 열면 「권한이 없습니다」가 보인다', await 상세.권한없음.isVisible(), true);
    });
  } finally {
    await 둘째회원정리(둘째, 둘째주문번호 === '' ? [] : [둘째주문번호]);
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
