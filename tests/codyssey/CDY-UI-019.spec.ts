import { defineCase, test, verify } from '@platform/kit';

import { FAQ목록 } from './pages/faq.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-019',
  name: 'FAQ 목록 화면에 제목, 탭 둘, 선택 상자, 입력칸, 버튼이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new FAQ목록(page);

  await test.step('FAQ 목록 화면을 연다', async () => {
    await 화면.열기();

    const 제목보임 = await 화면.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 제목 「FAQ」가 보인다', 제목보임, true);

    const 올인원탭보임 = await 화면.올인원탭
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 「AI 올인원」 탭이 보인다', 올인원탭보임, true);

    const 네이티브탭보임 = await 화면.네이티브탭
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 「AI 네이티브」 탭이 보인다', 네이티브탭보임, true);

    const 선택상자보임 = await 화면.카테고리선택상자
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 카테고리 선택 상자가 보인다', 선택상자보임, true);

    const 검색어칸보임 = await 화면.검색어칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 검색어 입력칸이 보인다', 검색어칸보임, true);

    const 검색버튼보임 = await 화면.검색버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('FAQ 목록 화면에 「검색」 버튼이 보인다', 검색버튼보임, true);
  });
});
