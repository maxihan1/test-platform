import { defineCase, test, verify } from '@platform/kit';

import { 홈에서이동한화면 } from './pages/common-links.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-010',
  name: '홈 탭에서 최신글은 작성 순, 인기글은 좋아요 순으로 5건이 보이고 글 제목을 누르면 상세로 간다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

const 메타 = (줄: string): string[] => (줄.split('\n')[1] ?? '').split(' · ');
const 작성순키 = (줄: string): string => {
  const 날짜 = 메타(줄)[1] ?? '';
  return /^\d{2}:\d{2}$/.test(날짜) ? `1${날짜}` : `0${날짜}`;
};
const 좋아요수 = (줄: string): number => Number((메타(줄)[2] ?? '').replace('좋아요 ', ''));
const 내림차순인가 = <T extends string | number>(값들: T[]): boolean => 값들.every((값, 번호) => 번호 === 0 || 값들[번호 - 1]! >= 값);

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동한화면 = new 홈에서이동한화면(page);

  await test.step('「최신글」 탭을 누른다', async () => {
    await 홈.열기();
    await 홈.공지팝업닫기();
    await 홈.글제목링크들().first().waitFor();
    await 홈.최신글탭().click();
    await 홈.글제목링크들().first().waitFor();
    const 줄들 = await 홈.글줄들().allInnerTexts();
    await verify(
      '「최신글」 탭을 누르면 작성 순 글 5건이 보인다',
      [await 홈.선택된탭('최신글').isVisible(), await 홈.글제목링크들().count(), 내림차순인가(줄들.map(작성순키))],
      [true, 5, true],
    );
  });

  await test.step('「인기글」 탭을 연다', async () => {
    await 홈.인기글탭().click();
    await 홈.글제목링크들().first().waitFor();
    const 줄들 = await 홈.글줄들().allInnerTexts();
    await verify(
      '「인기글」 탭에 좋아요 순 글 5건이 보인다',
      [await 홈.선택된탭('인기글').isVisible(), await 홈.글제목링크들().count(), 내림차순인가(줄들.map(좋아요수))],
      [true, 5, true],
    );
  });

  await test.step('목록의 글 제목을 누른다', async () => {
    const 제목 = (await 홈.글제목링크들().allInnerTexts())[0] ?? '';
    await 홈.글제목링크(제목).click();
    await 이동한화면.게시글제목(제목).waitFor();
    await verify('글 제목을 누르면 게시글 상세 화면으로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname), true);
  });
});
