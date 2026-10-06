import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-250',
  name: '필터를 바꾸면 목록이 처음부터 다시 나오고 「총 {N}개」가 전자기기 상품 수로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 상품들 = await 전체상품(page.request);
  const 전자기기 = 상품들.filter((상품) => 상품.category === '전자기기');

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.카드.nth(11).waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 목록을 한 번 내려 카드를 24개로 만든 뒤 「전자기기」를 켠다', async () => {
    await 목록.한번내리기();
    await 목록.카드.nth(23).waitFor();
    await verify('카드가 24개 보인다', await 목록.카드.count(), 24, { blocker: true });
    await 목록.카테고리('전자기기').check();
    await 목록.다시불러오기끝기다리기();
    await 목록.총개수.filter({ hasText: `총 ${전자기기.length}개` }).waitFor();
    await verify(
      '필터를 바꾸면 목록이 처음부터 다시 나오고 「총 {N}개」가 전자기기 상품 수로 바뀐다',
      `${await 목록.총개수.innerText()} · 카드 ${await 목록.카드.count()}개`,
      `총 ${전자기기.length}개 · 카드 ${Math.min(12, 전자기기.length)}개`,
    );
  });

  await test.step('상품 정렬을 「높은 가격순」으로 바꾼다', async () => {
    await 목록.정렬상자.selectOption({ label: '높은 가격순' });
    await 목록.다시불러오기끝기다리기();
    const 기대 = 전자기기
      .map((상품) => 상품.salePrice)
      .sort((앞, 뒤) => 뒤 - 앞)
      .slice(0, 12)
      .join(', ');
    await verify('정렬을 바꾸면 목록이 처음 12개부터 다시 나온다', (await 목록.카드가격들()).join(', '), 기대);
  });
});
