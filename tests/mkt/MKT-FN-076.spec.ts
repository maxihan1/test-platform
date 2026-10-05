import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 늦춘응답 } from './components/site-extra.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-076',
  name: '이벤트 띠가 늦게 들어오면 「인기글」 탭이 띠 높이만큼 아래로 밀려난다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다', '이벤트 띠 응답은 늦춘 응답이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 늦춘 = new 늦춘응답(page, '**/api/event-strip');

  try {
    await test.step('이벤트 띠 응답을 붙잡아 둔다', async () => {
      await 늦춘.걸기();
    });

    await test.step('홈 화면을 연다', async () => {
      await 안내창끄기(page);
      await 홈.열기();
      await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
      await verify('공지 팝업 · 설문은 이미 닫았다', [await 홈.공지팝업.count(), await 홈.설문.count()], [0, 0], { blocker: true });
      await 늦춘.도착기다리기();
      await verify('이벤트 띠 응답은 늦춘 응답이다', [늦춘.붙잡혔나(), await 홈.이벤트띠.count()], [true, 0], { blocker: true });
    });

    await test.step('홈 화면을 열고 붙잡아 둔 이벤트 띠 응답을 보낸다', async () => {
      const 밀리기전 = await 홈.인기글탭세로위치();
      await 늦춘.풀기();
      await 홈.이벤트띠.waitFor();
      const 밀린높이 = (await 홈.인기글탭세로위치()) - 밀리기전;
      const 띠높이 = await 홈.이벤트띠높이();
      await verify('이벤트 띠가 늦게 들어오면 「인기글」 탭이 띠 높이만큼 아래로 밀려난다', [띠높이 > 0, 밀린높이 >= 띠높이], [true, true]);
    });

    await test.step('이벤트 띠의 X 를 누른다', async () => {
      await 홈.이벤트띠닫기.click();
      await verify('이벤트 띠가 닫혀 보이지 않는다', await 홈.이벤트띠.isVisible(), false);
    });
  } finally {
    await 늦춘.걷기();
  }
});
