import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그아웃, 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 세션아이디, 홈열고장바구니기다리기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKF-UI-017',
  name: '장바구니가 빈 회원의 머리글 장바구니 아이콘에 숫자 배지가 보이지 않는다',
  precondition: ['장바구니가 빈 회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  let 정보: 회원정보 | undefined;

  try {
    await test.step('장바구니가 빈 회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(page.request);
      await 방해막기(page);
    });

    await test.step('장바구니가 빈 회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원이 새로 가입한 회원이다', (await 세션아이디(page)) === 정보?.loginId, true, { blocker: true });
      await verify('서버 장바구니가 비어 있다', (await 장바구니보기(page.request)).length, 0, { blocker: true });
    });

    await test.step('홈을 연다', async () => {
      await 홈열고장바구니기다리기(page);
      await 머리.로그아웃.waitFor();
      await verify('장바구니가 빈 회원의 머리글 장바구니 아이콘에 숫자 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    });

    await test.step('로그아웃해 비회원인지 확인한다', async () => {
      await API로그아웃(page.request);
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('비회원으로 홈을 새로 연다', async () => {
      await page.goto('/');
      await 머리.로그인.waitFor();
      await verify('비회원 머리글 장바구니 아이콘에 숫자 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    });
  } finally {
    if (정보 !== undefined) await 가입자정리하기(page.request, 정보);
  }
});
