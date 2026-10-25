import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 나타나는가, 넉넉한상품, 장바구니줄읽기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-209',
  name: '옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 알림 = new 토스트(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('옵션을 고르지 않고 「장바구니 담기」를 누른다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await 상세.담기();
      await verify('옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보인다', await 나타나는가(알림.글('옵션을 선택하세요')), true);
    });

    await test.step('「색상」만 고르고 「장바구니 담기」를 누른다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await 상세.옵션고르기(상품.colors[0], '');
      await 상세.담기();
      const 안내 = await verify('토스트 「옵션을 선택하세요」가 보인다', await 나타나는가(알림.글('옵션을 선택하세요')), true);
      const 그대로 = await verify('장바구니가 비어 있다', (await 장바구니줄읽기(page.request)).length, 0);
      await verify('「사이즈」를 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보이고 장바구니가 그대로다', 안내 && 그대로, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
