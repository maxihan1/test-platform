import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 나타나는가, 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-213',
  name: '옵션을 다 고르고 담으면 토스트 「장바구니에 담았습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  smoke: true,
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 알림 = new 토스트(page);
  const 머리 = new 머리글(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    let 배지전 = 0;
    await test.step('옵션을 다 고르고 「장바구니 담기」를 누른다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await 머리.그려질때까지();
      배지전 = (await 머리.장바구니배지.isVisible()) ? Number(await 머리.장바구니배지.innerText()) : 0;
      await 상세.옵션고르기(상품.colors[0], 상품.sizes[0]);
      await 상세.담기();
      await verify('옵션을 다 고르고 담으면 토스트 「장바구니에 담았습니다」가 보인다', await 나타나는가(알림.글('장바구니에 담았습니다')), true);
    });

    await test.step('담은 뒤 머리글 배지를 확인한다', async () => {
      await 머리.장바구니배지.waitFor();
      await verify('장바구니에 담으면 머리글 배지 숫자가 1 오른다', Number(await 머리.장바구니배지.innerText()) - 배지전, 1);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
