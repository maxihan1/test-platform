import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-241',
  name: '가격 슬라이더를 150,000원으로 옮기면 「~ 150,000원」이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 상품들 = await 전체상품(page.request);

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 150,000원으로 옮긴다', async () => {
    await 목록.가격옮기기(150000);
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('가격 슬라이더를 150,000원으로 옮기면 「~ 150,000원」이 보인다', await 목록.가격표시.innerText(), '~ 150,000원');
    const 비싼것들 = 상품들.filter((상품) => 상품.salePrice > 150000).map((상품) => 상품.name);
    const 보이는비싼것들 = (await 목록.카드이름들()).filter((이름) => 비싼것들.includes(이름));
    await verify('150,000원이 넘는 상품은 목록에 보이지 않는다', 보이는비싼것들.join(', '), '');
  });
});
