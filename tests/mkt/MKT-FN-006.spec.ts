import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 세션아이디, 장바구니에상품담기, 홈열고장바구니기다리기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-006',
  name: '장바구니가 빈 회원이 홈을 열면 머리글 장바구니 배지가 보이지 않는다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);

  let 새: 회원정보 | undefined;
  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      새 = await 새회원으로로그인(page.request);
      await 방해막기(page);
    });

    await test.step('새로 가입한 회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원이 새로 가입한 회원이다', (await 세션아이디(page)) === 새?.loginId, true, { blocker: true });
    });

    await test.step('장바구니가 빈 채로 홈을 연다', async () => {
      await verify('서버 장바구니가 비어 있다', (await 장바구니보기(page.request)).length, 0, { blocker: true });
      await 홈열고장바구니기다리기(page);
      await 머리.로그아웃.waitFor();
      await verify('장바구니가 빈 회원이 홈을 열면 머리글 장바구니 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    });

    await test.step('상품 한 개를 장바구니에 담고 홈을 연다', async () => {
      await 장바구니에상품담기(page.request, 1);
      await verify('서버 장바구니에 상품이 한 줄 담겨 있다', (await 장바구니보기(page.request)).length, 1, { blocker: true });
      await 홈열고장바구니기다리기(page);
      await 머리.장바구니배지.waitFor();
      await verify('장바구니에 상품 한 줄을 담으면 머리글 장바구니 배지에 「1」이 보인다', await 머리.장바구니배지.innerText(), '1');
    });
  } finally {
    if (새 !== undefined) await 탈퇴(page.request);
  }
});
