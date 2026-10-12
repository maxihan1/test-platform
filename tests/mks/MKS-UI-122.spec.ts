import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 로그인한아이디, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-122',
  name: '주문한 적이 없는 회원의 주문 내역에 「주문 내역이 없습니다」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문내역 = new 내주문내역화면(page);
  let 정보!: 회원정보;

  try {
    await test.step('새 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', await 로그인한아이디(page.request), 정보.loginId, { blocker: true });
    });

    await test.step('주문 내역을 연다', async () => {
      await 주문내역.열기();
      await 주문내역.표.or(주문내역.빈안내).waitFor();
      await verify('주문 내역 화면이 열려 있다', 경로(page), 내주문내역화면.주소, { blocker: true });
      await verify('주문한 적이 없는 회원의 주문 내역에 「주문 내역이 없습니다」가 보인다', await 주문내역.빈안내.isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
