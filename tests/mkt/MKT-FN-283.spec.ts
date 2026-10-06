import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 상품자세히조회 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-283',
  name: '문의 질문을 누르면 그 아래에 답변이 펼쳐진다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 상품 = await 상품자세히조회(page.request, 상품번호.니트가디건);
  const [첫째, 둘째] = 상품.qna;
  if (!첫째 || !둘째) throw new Error('상품 문의가 둘 이상 있어야 한다');

  await test.step('상품 문의 탭을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품.id);
    await 상세.상품문의탭.click();
    await 상세.문의질문(첫째.question).waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('「상품 문의」 탭에서 첫 질문을 누른다', async () => {
    await 상세.문의질문(첫째.question).click();
    await 상세.문의답변(첫째.answer).waitFor();
    await verify('문의 질문을 누르면 그 아래에 답변이 펼쳐진다', await 상세.질문이열렸고답변이아래에있나(첫째.question, 첫째.answer), true);
  });

  await test.step('둘째 질문을 누른다', async () => {
    await 상세.문의질문(둘째.question).click();
    await 상세.문의답변(둘째.answer).waitFor();
    const 보임 = await Promise.all([상세.문의답변(첫째.answer).isVisible(), 상세.문의답변(둘째.answer).isVisible()]);
    await verify('두 질문의 답변이 함께 펼쳐져 보인다', 보임, [true, true]);
  });

  await test.step('첫 질문을 다시 누른다', async () => {
    await 상세.문의질문(첫째.question).click();
    await 상세.문의답변(첫째.answer).waitFor({ state: 'hidden' });
    await verify('다시 누른 질문의 답변이 접힌다', await 상세.문의답변(첫째.answer).isVisible(), false);
  });
});
