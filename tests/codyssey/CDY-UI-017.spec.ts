import { defineCase, test, verify } from '@platform/kit';

import { 공지사항화면 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-017',
  name: '공지사항 목록 화면에 제목, 입력칸 둘, 버튼이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);

  await test.step('공지사항 목록 화면을 연다', async () => {
    await 화면.열기();

    const 제목보임 = await 화면.목록제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 제목 「공지사항」이 보인다', 제목보임, true);

    const 검색어칸보임 = await 화면.검색어칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 검색어 입력칸이 보인다', 검색어칸보임, true);

    const 등록일칸보임 = await 화면.등록일칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 등록일 입력칸이 보인다', 등록일칸보임, true);

    const 검색버튼보임 = await 화면.검색버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 「검색」 버튼이 보인다', 검색버튼보임, true);
  });
});
