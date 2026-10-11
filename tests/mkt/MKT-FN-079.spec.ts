import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-079',
  name: '없는 상품 번호로 상품 상세를 열면 깨지지 않고 안내가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('없는 상품 번호로 상품 상세를 연다', async () => {
    await 방해막기(page);
    await 상세.열기(999999);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '없는 상품 번호로 상품 상세를 열면 깨지지 않고 안내가 보인다',
      (await 상세.없는상품안내.isVisible()) ? await 상세.없는상품안내.innerText() : '안내 없음',
      '상품을 찾을 수 없습니다',
    );
  });
});
