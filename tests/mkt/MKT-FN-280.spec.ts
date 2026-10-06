import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 상품자세히조회 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-280',
  name: '「상품 문의」 탭을 누르면 문의 내용이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 상품 = await 상품자세히조회(page.request, 상품번호.니트가디건);
  const 질문들 = 상품.qna.map((문의) => 문의.question);
  let 처음주소 = '';

  await test.step('상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품.id);
    await 상세.상품문의탭.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    처음주소 = page.url();
  });

  await test.step('상품 상세에서 「상품 문의」 탭을 누른다', async () => {
    await 상세.상품문의탭.click();
    await 상세.문의질문(질문들[0] ?? '').waitFor();
    const 보임 = await Promise.all(질문들.map((질문) => 상세.문의질문(질문).isVisible()));
    await verify('「상품 문의」 탭을 누르면 문의 내용이 보인다', 질문들.filter((_, 순서) => 보임[순서]).join(', '), 질문들.join(', '));
    await verify('탭을 눌러도 주소는 바뀌지 않는다', page.url(), 처음주소);
  });
});
