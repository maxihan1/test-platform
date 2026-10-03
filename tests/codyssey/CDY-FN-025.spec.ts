import { defineCase, test, verify } from '@platform/kit';

import { FAQ목록 } from './pages/faq.page.js';
import { 네이티브모집안내화면 } from './pages/native.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-025',
  name: 'AI 네이티브 모집안내 화면에서 「FAQ」 버튼을 누르면 FAQ 목록 화면 제목 「FAQ」가 보인다',
  platforms: ['desktop'],
  precondition: ['AI 네이티브 모집안내 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 모집안내 = new 네이티브모집안내화면(page);
  const FAQ화면 = new FAQ목록(page);

  await test.step('AI 네이티브 모집안내 화면을 연다', async () => {
    await 모집안내.열기();
  });

  await test.step('AI 네이티브 모집안내 화면의 「FAQ」 버튼을 확인한다', async () => {
    const 제목보임 = await 모집안내.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 제목 「AI 네이티브」가 보인다', 제목보임, true, { blocker: true });

    const 버튼보임 = await 모집안내.FAQ버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 「FAQ」 버튼이 보인다', 버튼보임, true, { blocker: true });
  });

  await test.step('「FAQ」 버튼을 누른다', async () => {
    await 모집안내.FAQ누르기();

    const FAQ제목보임 = await FAQ화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify(
      'AI 네이티브 모집안내 화면에서 「FAQ」 버튼을 누르면 FAQ 목록 화면 제목 「FAQ」가 보인다',
      FAQ제목보임,
      true,
    );
  });
});
