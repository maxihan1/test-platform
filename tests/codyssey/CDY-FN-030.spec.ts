import { defineCase, test, verify } from '@platform/kit';

import { 코디세이사람들목록 } from './pages/people.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-030',
  name: '코디세이 사람들 검색어에 없는 말을 적고 「검색」을 누르면 「등록된 코디세이 사람들이 없습니다.」가 보인다',
  platforms: ['desktop'],
  precondition: ['코디세이 사람들 목록 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 코디세이사람들목록(page);

  await test.step('코디세이 사람들 목록 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('코디세이 사람들 목록 화면의 검색어 입력칸을 확인한다', async () => {
    const 제목보임 = await 화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 사람들 목록 화면에 제목 「코디세이 사람들」이 보인다', 제목보임, true, { blocker: true });

    const 검색어칸보임 = await 화면.검색어칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('코디세이 사람들 목록 화면에 검색어 입력칸이 보인다', 검색어칸보임, true, { blocker: true });
  });

  await test.step('없는 검색어를 적고 「검색」을 누른다', async () => {
    await 화면.검색하기('zzzqq없음');

    const 안내보임 = await 화면.검색결과없음안내
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify(
      '코디세이 사람들 검색어에 없는 말을 적고 「검색」을 누르면 「등록된 코디세이 사람들이 없습니다.」가 보인다',
      안내보임,
      true,
    );
  });
});
