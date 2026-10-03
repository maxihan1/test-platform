import { defineCase, test, verify } from '@platform/kit';

import { 소개화면 } from './pages/intro.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-008',
  name: '코디세이 소개 화면에 제목과 구역 제목 넷이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 소개 = new 소개화면(page);

  await test.step('코디세이 소개 화면을 연다', async () => {
    await 소개.열기();

    const 제목보임 = await 소개.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 소개 화면에 제목 「코디세이 소개」가 보인다', 제목보임, true);

    const 인재상보임 = await 소개.구역제목('교육 인재상')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 소개 화면에 「교육 인재상」 구역 제목이 보인다', 인재상보임, true);

    const 코디세이란보임 = await 소개.구역제목('코디세이란?')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 소개 화면에 「코디세이란?」 구역 제목이 보인다', 코디세이란보임, true);

    const 프로세스보임 = await 소개.구역제목('학습 프로세스')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 소개 화면에 「학습 프로세스」 구역 제목이 보인다', 프로세스보임, true);

    const 진도관리보임 = await 소개.구역제목('학습진도관리')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 소개 화면에 「학습진도관리」 구역 제목이 보인다', 진도관리보임, true);
  });
});
