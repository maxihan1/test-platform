import { defineCase, test, verify } from '@platform/kit';

import { 공지사항화면 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-026',
  name: '공지사항 검색어에 「모집」을 적고 「검색」을 누르면 목록의 모든 제목에 「모집」이 들어 있다',
  platforms: ['desktop'],
  precondition: ['공지사항 목록 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);

  await test.step('공지사항 목록 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('공지사항 목록 화면의 검색어 입력칸을 확인한다', async () => {
    const 제목보임 = await 화면.목록제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 제목 「공지사항」이 보인다', 제목보임, true, { blocker: true });

    const 검색어칸보임 = await 화면.검색어칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 검색어 입력칸이 보인다', 검색어칸보임, true, { blocker: true });
  });

  await test.step('검색어 「모집」을 적고 「검색」을 누른다', async () => {
    await 화면.검색하기('모집');

    const 모든제목에_모집 = await 화면.모든제목에_들어_있는가('모집');
    await verify(
      '공지사항 검색어에 「모집」을 적고 「검색」을 누르면 목록의 모든 제목에 「모집」이 들어 있다',
      모든제목에_모집,
      true,
    );
  });
});
