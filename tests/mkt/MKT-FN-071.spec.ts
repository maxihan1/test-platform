import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 전체상품읽기 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-071',
  name: '상품 목록 끝까지 내리면 다음 12개가 이어 붙어 24개가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
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

  await test.step('상품 목록 끝까지 내린다', async () => {
    await 목록.한번내리기();
    await 목록.카드.nth(23).waitFor();
    await verify('상품 목록 끝까지 내리면 다음 12개가 이어 붙어 24개가 보인다', await 목록.카드.count(), 24);
  });

  await test.step('카테고리 「도서」 와 「식품」 을 함께 고른다', async () => {
    await 목록.카테고리고르기('도서');
    await 목록.카테고리고르기('식품');
    await 목록.끝까지내리기();
    const 기대 = 전체.filter((p) => p.category === '도서' || p.category === '식품').map((p) => p.name);
    await verify(
      '카테고리 「도서」 와 「식품」 을 함께 고르면 두 카테고리 상품만 보인다',
      (await 목록.카드이름들()).sort(),
      기대.sort(),
    );
  });

  await test.step('고른 카테고리를 모두 끈다', async () => {
    await 목록.카테고리끄기('도서');
    await 목록.카테고리끄기('식품');
    await 목록.끝까지내리기();
    await verify('카테고리를 모두 끄면 전체 상품이 보인다', (await 목록.카드이름들()).sort(), 전체.map((p) => p.name).sort());
  });

  await test.step('가격 슬라이더를 150,000원으로 옮긴다', async () => {
    await 목록.가격옮기기(150000);
    await verify('가격 슬라이더를 150,000원으로 옮기면 옆에 「~ 150,000원」 이 보인다', await 목록.가격표시.innerText(), '~ 150,000원');
  });

  await test.step('「품절 상품 제외」 를 켠다', async () => {
    await 목록.열기();
    await 목록.품절제외.check();
    await 목록.끝까지내리기();
    const 품절이름 = 전체.filter((p) => p.soldOut).map((p) => p.name);
    const 보이는품절 = (await 목록.카드이름들()).filter((이름) => 품절이름.includes(이름));
    await verify('「품절 상품 제외」 를 켜면 품절 상품이 목록에서 빠진다', 보이는품절, []);
  });

  await test.step('정렬을 「낮은 가격순」 으로 고른다', async () => {
    await 목록.열기();
    await 목록.정렬고르기('낮은 가격순');
    await 목록.끝까지내리기();
    const 가격들 = await 목록.카드판매가들();
    await verify('「낮은 가격순」 을 고르면 가격이 낮은 상품부터 보인다', 가격들, [...가격들].sort((a, b) => a - b));
  });

  await test.step('목록을 내린 뒤 카테고리를 바꾼다', async () => {
    await 목록.열기();
    await 목록.한번내리기();
    await 목록.카드.nth(23).waitFor();
    await 목록.카테고리고르기('도서');
    await 목록.카테고리고르기('식품');
    await 목록.불러오기끝기다리기();
    await verify('필터를 바꾸면 상품 목록이 처음 12개부터 다시 보인다', await 목록.카드.count(), 12);
  });

  await test.step('카테고리 「도서」 를 고른다', async () => {
    await 목록.열기();
    await 목록.카테고리고르기('도서');
    await 목록.불러오기끝기다리기();
    const 도서수 = 전체.filter((p) => p.category === '도서').length;
    await verify('필터를 바꾸면 「총 {N}개」 가 그 조건의 상품 수로 바뀐다', await 목록.총개수.innerText(), `총 ${도서수}개`);
  });
});
