import { defineCase, test, verify } from '@platform/kit';

import { 네이티브모집안내화면 } from './pages/native.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-016',
  name: 'AI 네이티브 모집안내 화면에 제목, 버튼 셋, 구역 제목이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 네이티브모집안내화면(page);

  await test.step('AI 네이티브 모집안내 화면을 연다', async () => {
    await 화면.열기();

    const 제목보임 = await 화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 제목 「AI 네이티브」가 보인다', 제목보임, true);

    const 바로보기보임 = await 화면.공고문바로보기버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 「공고문 바로보기」 버튼이 보인다', 바로보기보임, true);

    const 다운로드보임 = await 화면.공고문다운로드버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 「공고문 다운로드」 버튼이 보인다', 다운로드보임, true);

    const FAQ버튼보임 = await 화면.FAQ버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 「FAQ」 버튼이 보인다', FAQ버튼보임, true);

    const 신청절차보임 = await 화면.신청절차구역제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 네이티브 모집안내 화면에 「신청절차」 구역 제목이 보인다', 신청절차보임, true);
  });
});
