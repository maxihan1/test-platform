import { defineCase, test, verify } from '@platform/kit';

import { FAQ목록 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-031',
  name: 'FAQ 목록에서 「AI 네이티브」 탭을 누르면 카테고리 선택지에 「교육 혜택」이 생긴다',
  platforms: ['desktop'],
  precondition: ['FAQ 목록 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ목록(page);

  await test.step('FAQ 목록 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('FAQ 목록 화면의 「AI 네이티브」 탭을 확인한다', async () => {
    const 제목보임 = await 화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 제목 「FAQ」가 보인다', 제목보임, true, { blocker: true });

    const 탭보임 = await 화면.네이티브탭
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 「AI 네이티브」 탭이 보인다', 탭보임, true, { blocker: true });
  });

  await test.step('「AI 네이티브」 탭을 누른다', async () => {
    await 화면.네이티브탭_누르기();

    await 화면
      .선택지('교육 혜택')
      .first()
      .waitFor({ state: 'attached', timeout: 10000 })
      .then(() => true, () => false);
    await verify(
      'FAQ 목록에서 「AI 네이티브」 탭을 누르면 카테고리 선택지에 「교육 혜택」이 생긴다',
      await 화면.선택지('교육 혜택').count(),
      1,
    );
  });
});
