import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-254',
  name: '맞는 상품이 6개 넘어도 자동완성 항목은 5개만 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 글자 = '스';
  const 맞는상품들 = (await 전체상품(page.request)).filter((상품) => 상품.name.includes(글자)).map((상품) => 상품.name);

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 검색칸에 맞는 상품이 6개 넘는 글자를 적는다', async () => {
    await verify('맞는 상품이 6개 넘는 글자다', 맞는상품들.length >= 6, true, { blocker: true });
    await 목록.검색칸.fill(글자);
    await 목록.자동완성목록.waitFor();
    await verify('맞는 상품이 6개 넘어도 자동완성 항목은 5개만 보인다', await 목록.자동완성항목.count(), 5);
  });
});
