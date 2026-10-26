import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-162',
  name: '상품 상세 아래에 「상품 설명」 · 「리뷰 (<개수>)」 · 「상품 문의」 탭이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('상품 상세 아래 탭을 확인한다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    const 설명 = await verify('「상품 설명」 탭이 보인다', await 상세.설명탭.isVisible(), true);
    const 리뷰 = await verify('「리뷰 (<개수>)」 탭이 보인다', await 상세.리뷰탭.innerText(), `리뷰 (${상품.reviewCount})`);
    const 문의 = await verify('「상품 문의」 탭이 보인다', await 상세.문의탭.isVisible(), true);
    await verify('상품 상세 아래에 「상품 설명」 · 「리뷰 (<개수>)」 · 「상품 문의」 탭이 보인다', 설명 && 리뷰 && 문의, true);
  });

  await test.step('「상품 문의」 탭을 누른다', async () => {
    const 주소전 = await 상세.주소();
    await 상세.문의탭.click();
    await 상세.문의패널.waitFor();
    const 주소같음 = await verify('주소가 그대로다', await 상세.주소(), 주소전);
    const 문의보임 = await verify('「상품 문의」 내용이 보인다', await 상세.문의패널.isVisible(), true);
    const 설명숨김 = await verify('「상품 설명」 내용이 보이지 않는다', await 상세.설명패널.isVisible(), false);
    await verify('상품 상세 탭을 누르면 내용만 바뀌고 주소는 그대로다', 주소같음 && 문의보임 && 설명숨김, true);
  });
});
