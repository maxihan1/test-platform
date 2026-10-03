import { defineCase, test, verify } from '@platform/kit';

import { FAQ목록 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-034',
  name: 'FAQ 목록에서 「다음」을 누르면 「이전」 버튼이 켜진다',
  platforms: ['desktop'],
  precondition: ['FAQ 목록 화면이 열려 있다', 'FAQ 목록이 첫 쪽이다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ목록(page);

  await test.step('FAQ 목록 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('FAQ 목록 첫 쪽의 「이전」 버튼을 확인한다', async () => {
    const 이전보임 = await 화면.이전버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록에 「이전」 버튼이 보인다', 이전보임, true, { blocker: true });

    await verify('FAQ 목록 첫 쪽에서 「이전」 버튼이 꺼져 있다', await 화면.이전버튼.isDisabled(), true, {
      blocker: true,
    });
  });

  await test.step('쪽 이동의 「다음」을 누른다', async () => {
    await 화면.다음쪽으로_가기();

    await 화면.이전버튼.click({ trial: true, timeout: 10000 }).then(() => true, () => false);
    await verify('FAQ 목록에서 「다음」을 누르면 「이전」 버튼이 켜진다', await 화면.이전버튼.isEnabled(), true);
  });
});
