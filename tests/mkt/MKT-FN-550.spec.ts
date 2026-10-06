import { defineCase, test, verify } from '@platform/kit';

import { 자동완성응답걸기, 자동완성응답풀기, 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-550',
  name: '맞는 상품이 5개면 자동완성 항목 5개가 다 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '자동완성 응답은 가짜 응답(모킹)이다 — 맞는 상품이 5개인 글자'],
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

  try {
    await test.step('상품 검색칸에 맞는 상품이 5개인 글자를 적는다', async () => {
      await 자동완성응답걸기(page, 맞는상품들.slice(0, 5));
      await 목록.검색칸.fill(글자);
      await 목록.자동완성목록.waitFor();
      await verify('맞는 상품이 5개면 자동완성 항목 5개가 다 보인다', await 목록.자동완성항목.count(), 5);
    });
  } finally {
    await 자동완성응답풀기(page);
  }
});
