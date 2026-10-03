import { defineCase, test, verify } from '@platform/kit';

import { 코디세이사람들목록 } from './pages/people.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-018',
  name: '코디세이 사람들 목록 화면에 제목, 입력칸, 버튼이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 코디세이사람들목록(page);

  await test.step('코디세이 사람들 목록 화면을 연다', async () => {
    await 화면.열기();

    const 제목보임 = await 화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 사람들 목록 화면에 제목 「코디세이 사람들」이 보인다', 제목보임, true);

    const 검색어칸보임 = await 화면.검색어칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 사람들 목록 화면에 검색어 입력칸이 보인다', 검색어칸보임, true);

    const 검색버튼보임 = await 화면.검색버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 사람들 목록 화면에 「검색」 버튼이 보인다', 검색버튼보임, true);
  });
});
