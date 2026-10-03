import { defineCase, test, verify } from '@platform/kit';

import { 캠퍼스화면 } from './pages/campus.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-009',
  name: '캠퍼스 안내 화면에 제목, 구역 제목, 캠퍼스 카드가 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 캠퍼스 = new 캠퍼스화면(page);

  await test.step('캠퍼스 안내 화면을 연다', async () => {
    await 캠퍼스.열기();

    const 제목보임 = await 캠퍼스.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('캠퍼스 안내 화면에 제목 「캠퍼스 안내」가 보인다', 제목보임, true);

    const 지역별보임 = await 캠퍼스.구역제목('지역별 Codyssey 캠퍼스')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('캠퍼스 안내 화면에 「지역별 Codyssey 캠퍼스」 구역 제목이 보인다', 지역별보임, true);

    await 캠퍼스.캠퍼스카드.last().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const 카드수 = await 캠퍼스.캠퍼스카드.count();
    await verify('캠퍼스 안내 화면에 캠퍼스 카드가 세 장 보인다', 카드수, 3);

    const 층별보임 = await 캠퍼스.구역제목('층별 안내')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('캠퍼스 안내 화면에 「층별 안내」 구역 제목이 보인다', 층별보임, true);

    const 오시는길보임 = await 캠퍼스.구역제목('오시는 길')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('캠퍼스 안내 화면에 「오시는 길」 구역 제목이 보인다', 오시는길보임, true);
  });
});
