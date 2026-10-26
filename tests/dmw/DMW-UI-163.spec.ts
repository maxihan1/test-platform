import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품, 상품문의읽기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-163',
  name: '상품 문의 질문을 누르면 그 아래 답변이 펼쳐진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  const 문의들 = await 상품문의읽기(request, 상품.id);
  await 안내창막기(page);

  await test.step('「상품 문의」 탭의 첫 질문을 누른다', async () => {
    await 상세.열기(상품.id);
    await 상세.문의탭.click();
    await verify('「상품 문의」 탭에 첫 질문이 보인다', await 상세.질문(문의들[0].question).isVisible(), true, { blocker: true });
    await 상세.질문(문의들[0].question).click();
    await verify('상품 문의 질문을 누르면 그 아래 답변이 펼쳐진다', await 상세.답변(문의들[0].answer).isVisible(), true);
  });

  await test.step('펼친 질문을 다시 누른다', async () => {
    await 상세.질문(문의들[0].question).click();
    await verify('펼친 상품 문의 질문을 다시 누르면 답변이 접힌다', await 상세.답변(문의들[0].answer).isVisible(), false);
  });

  await test.step('두 질문을 차례로 누른다', async () => {
    await 상세.질문(문의들[0].question).click();
    await 상세.질문(문의들[1].question).click();
    const 첫답 = await verify('첫 질문의 답변이 보인다', await 상세.답변(문의들[0].answer).isVisible(), true);
    const 둘째답 = await verify('둘째 질문의 답변이 보인다', await 상세.답변(문의들[1].answer).isVisible(), true);
    await verify('상품 문의 질문 둘을 누르면 두 답변이 함께 펼쳐진다', 첫답 && 둘째답, true);
  });
});
