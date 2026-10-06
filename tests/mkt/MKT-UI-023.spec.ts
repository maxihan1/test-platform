import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-023',
  name: '홈 배너 아래에 「인기글」 · 「최신글」 탭이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 안내창끄기(page);
    await 홈.열기();
    await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업 · 설문은 이미 닫았다', [await 홈.공지팝업.count(), await 홈.설문.count()], [0, 0], { blocker: true });
    await verify(
      '홈 배너 아래에 「인기글」 · 「최신글」 탭이 보인다',
      [await 홈.게시글탭('인기글').isVisible(), await 홈.게시글탭('최신글').isVisible(), await 홈.배너가글목록보다위쪽인가()],
      [true, true, true],
    );
    await verify('처음에는 「인기글」 탭이 선택되어 있다', [await 홈.탭이선택됐나('인기글'), await 홈.탭이선택됐나('최신글')], [true, false]);
    const 좋아요 = await 홈.글좋아요수들();
    await verify(
      '「인기글」 탭에 글 5건이 좋아요 많은 순으로 보인다',
      [좋아요.length, 좋아요.every((수, 위치) => 위치 === 0 || (좋아요[위치 - 1] ?? 0) >= 수)],
      [5, true],
    );
  });
});
