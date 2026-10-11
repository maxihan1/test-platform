import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 전체상품읽기 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-073',
  name: '가격 슬라이더를 0원으로 옮기면 옆에 「~ 0원」 이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 전체 = await 전체상품읽기(request);

  await test.step('상품 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 0원으로 옮긴다', async () => {
    await 목록.가격옮기기(0);
    await verify('가격 슬라이더를 0원으로 옮기면 옆에 「~ 0원」 이 보인다', await 목록.가격표시.innerText(), '~ 0원');
  });

  await test.step('가격 슬라이더를 500,000원으로 옮긴다', async () => {
    await 목록.가격옮기기(500000);
    await 목록.끝까지내리기();
    await verify(
      '가격 슬라이더를 500,000원으로 옮기면 「~ 500,000원」 이 보이고 전체 상품이 보인다',
      { 표시: await 목록.가격표시.innerText(), 상품수: await 목록.카드.count() },
      { 표시: '~ 500,000원', 상품수: 전체.length },
    );
  });

  await test.step('가격 슬라이더를 끝까지 밀어 500,001원을 넘기려 한다', async () => {
    await 목록.슬라이더끝으로밀기();
    await verify('가격 슬라이더는 500,000원을 넘겨 500,001원으로 갈 수 없다', await 목록.가격슬라이더.inputValue(), '500000');
  });
});
