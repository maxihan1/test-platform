import { defineCase, test, verify } from '@platform/kit';

import { 올인원모집안내화면 } from './pages/recruit.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-015',
  name: 'AI 올인원 모집안내 화면에 제목과 구역 제목 셋이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 올인원모집안내화면(page);

  await test.step('AI 올인원 모집안내 화면을 연다', async () => {
    await 화면.열기();

    const 제목보임 = await 화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 올인원 모집안내 화면에 제목 「AI 올인원」이 보인다', 제목보임, true);

    const 성장보임 = await 화면.성장구역제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 올인원 모집안내 화면에 「코디세이 AI 올인원 과정을 통한 성장」 구역 제목이 보인다', 성장보임, true);

    const 지원혜택보임 = await 화면.지원혜택구역제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 올인원 모집안내 화면에 「지원 혜택」 구역 제목이 보인다', 지원혜택보임, true);

    const 유의사항보임 = await 화면.유의사항구역제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('AI 올인원 모집안내 화면에 「지원 시 유의사항」 구역 제목이 보인다', 유의사항보임, true);
  });
});
