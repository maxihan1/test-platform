import { defineCase, test, verify } from '@platform/kit';

import { 세계관화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-007',
  name: '코디세이 세계관 화면에 제목, 구역 제목, 스토리 카드, 소개 영상이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 세계관 = new 세계관화면(page);

  await test.step('코디세이 세계관 화면을 연다', async () => {
    await 세계관.열기();

    const 제목보임 = await 세계관.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 세계관 화면에 제목 「코디세이 세계관」이 보인다', 제목보임, true);

    const 브랜드보임 = await 세계관.구역제목('BRAND')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 세계관 화면에 「BRAND」 구역 제목이 보인다', 브랜드보임, true);

    const 정체성보임 = await 세계관.구역제목('IDENTITY')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 세계관 화면에 「IDENTITY」 구역 제목이 보인다', 정체성보임, true);

    const 스토리보임 = await 세계관.구역제목('STORY')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 세계관 화면에 「STORY」 구역 제목이 보인다', 스토리보임, true);

    await 세계관.스토리카드.last().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const 카드수 = await 세계관.스토리카드.count();
    await verify('코디세이 세계관 화면에 스토리 카드가 열두 장 보인다', 카드수, 12);

    const 영상보임 = await 세계관.소개영상플레이어
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 세계관 화면에 소개 영상 플레이어가 보인다', 영상보임, true);
  });
});
