import { defineCase, test, verify } from '@platform/kit';

import { 교육일정화면 } from './pages/schedule.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-012',
  name: '연간 교육일정 화면에 제목과 표, 과정별 줄 넷이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 일정 = new 교육일정화면(page);

  await test.step('연간 교육일정 화면을 연다', async () => {
    await 일정.열기();

    const 제목보임 = await 일정.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('연간 교육일정 화면에 제목 「연간 교육일정」이 보인다', 제목보임, true);

    const 표보임 = await 일정.표
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('연간 교육일정 화면에 「연간 교육일정」 표가 보인다', 표보임, true);

    const 올인원1기보임 = await 일정.줄('AI 올인원 1기')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('연간 교육일정 표에 「AI 올인원 1기」 줄이 보인다', 올인원1기보임, true);

    const 올인원2기보임 = await 일정.줄('AI 올인원 2기')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('연간 교육일정 표에 「AI 올인원 2기」 줄이 보인다', 올인원2기보임, true);

    const 네이티브1차보임 = await 일정.줄('AI 네이티브 1차')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('연간 교육일정 표에 「AI 네이티브 1차」 줄이 보인다', 네이티브1차보임, true);

    const 네이티브2차보임 = await 일정.줄('AI 네이티브 2차')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('연간 교육일정 표에 「AI 네이티브 2차」 줄이 보인다', 네이티브2차보임, true);
  });
});
