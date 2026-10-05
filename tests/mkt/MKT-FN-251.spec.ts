import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-251',
  name: '조건에 맞는 상품이 0개면 「조건에 맞는 상품이 없습니다」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 상품들 = await 전체상품(page.request);
  const 가장싼값 = Math.min(...상품들.map((상품) => 상품.salePrice));
  const 슬라이더값 = Math.ceil(가장싼값 / 10000) * 10000;

  await test.step('상품 목록에서 가격 슬라이더를 0원으로 옮긴다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 목록.가격옮기기(0);
    await 목록.총개수.filter({ hasText: '총 0개' }).waitFor();
    await verify('조건에 맞는 상품이 0개면 「조건에 맞는 상품이 없습니다」가 보인다', await 목록.빈상태안내.isVisible(), true);
  });

  await test.step('가격 슬라이더를 가장 싼 상품만 들어오는 값으로 옮긴다', async () => {
    await verify('가장 싼 상품만 들어오는 값이다', 상품들.filter((상품) => 상품.salePrice <= 슬라이더값).length, 1, { blocker: true });
    await 목록.가격옮기기(슬라이더값);
    await 목록.총개수.filter({ hasText: '총 1개' }).waitFor();
    const 빈상태 = (await 목록.빈상태안내.isVisible()) ? ' · 「조건에 맞는 상품이 없습니다」가 보인다' : '';
    await verify('조건에 맞는 상품이 1개면 「조건에 맞는 상품이 없습니다」 없이 「총 1개」가 보인다', `${await 목록.총개수.innerText()}${빈상태}`, '총 1개');
  });
});
