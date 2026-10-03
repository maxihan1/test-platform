import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-015',
  name: '홈의 「인기글」 · 「최신글」 탭이 5건씩 보여 주고 글 제목을 누르면 상세로 간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 오늘 = new Date();
  const 두자리 = (값: number): string => String(값).padStart(2, '0');
  const 오늘날짜 = `${오늘.getFullYear()}-${두자리(오늘.getMonth() + 1)}-${두자리(오늘.getDate())}`;
  const 줄들 = async (): Promise<string[]> => 홈.글줄들.allInnerTexts();
  const 좋아요들 = (글자들: string[]): number[] => 글자들.map((글자) => Number(/좋아요 (\d+)/.exec(글자)?.[1] ?? -1));
  const 작성시각들 = (글자들: string[]): string[] =>
    글자들.map((글자) => {
      const 값 = /· (\d{4}-\d{2}-\d{2}|\d{2}:\d{2}) ·/.exec(글자)?.[1] ?? '';
      return 값.includes(':') ? `${오늘날짜} ${값}` : `${값} 00:00`;
    });
  const 내림차순 = <T extends string | number>(값들: T[]): boolean => 값들.every((값, 번호) => 번호 === 0 || 값들[번호 - 1]! >= 값);

  await test.step('홈 화면에서 「인기글」 탭을 확인한다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 홈.글제목들.first().waitFor();
    const 인기 = 좋아요들(await 줄들());
    await verify('「인기글」 탭에는 좋아요 많은 순 5건이 보인다', [인기.length, 내림차순(인기)], [5, true]);
  });

  await test.step('홈 화면에서 「최신글」 탭을 누른다', async () => {
    await Promise.all([page.waitForResponse((응답) => 응답.url().includes('sort=latest')), 홈.최신글탭.click()]);
    await 홈.글제목들.first().waitFor();
    const 최신 = 작성시각들(await 줄들());
    await verify('「최신글」 탭을 누르면 작성 순 5건이 보인다', [최신.length, 내림차순(최신)], [5, true]);
  });

  await test.step('홈 화면에서 글 제목을 누른다', async () => {
    await 홈.글제목들.first().click();
    await verify('글 제목을 누르면 게시글 상세로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname), true);
  });
});
