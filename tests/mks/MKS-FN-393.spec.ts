import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 로그인한아이디, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-393',
  name: '다른 회원의 주문 번호로 주문 상세를 열면 「권한이 없습니다」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 상세 = new 내주문상세화면(page);
  let 정보!: 회원정보;

  try {
    await test.step('새 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', await 로그인한아이디(page.request), 정보.loginId, { blocker: true });
    });

    await test.step('테스트 계정의 주문 번호 「DM20261010-0001」로 주문 상세를 연다', async () => {
      await 상세.열기('DM20261010-0001');
      await 상세.권한없음.or(상세.상품목록제목).waitFor();
      await verify('주문 상세 화면이 열려 있다', 경로(page), '/my/orders/DM20261010-0001', { blocker: true });
      await verify('다른 회원의 주문 번호로 주문 상세를 열면 「권한이 없습니다」가 보인다', await 상세.권한없음.isVisible(), true);
      await verify('다른 회원의 주문 상품 목록이 보이지 않는다', await 상세.상품목록제목.isVisible(), false);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
