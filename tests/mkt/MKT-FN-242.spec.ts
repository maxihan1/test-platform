import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-242',
  name: '가격 슬라이더를 0원으로 옮기면 「~ 0원」이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 0원으로 옮긴다', async () => {
    await 목록.가격옮기기(0);
    await 목록.총개수.filter({ hasText: '총 0개' }).waitFor();
    await verify('가격 슬라이더를 0원으로 옮기면 「~ 0원」이 보인다', await 목록.가격표시.innerText(), '~ 0원');
  });

  await test.step('가격 슬라이더를 500,000원으로 옮긴다', async () => {
    await 목록.가격옮기기(500000);
    await 목록.카드.first().waitFor();
    await verify('가격 슬라이더를 끝까지 옮기면 「~ 500,000원」이 보인다', await 목록.가격표시.innerText(), '~ 500,000원');
  });

  await test.step('가격 슬라이더 값에 500,001을 넣는다', async () => {
    await 목록.가격값직접넣기(500001);
    await verify('500,001원을 넣어도 슬라이더 값은 500,000원을 넘지 않는다', Number(await 목록.가격슬라이더.inputValue()) <= 500000, true);
  });
});
