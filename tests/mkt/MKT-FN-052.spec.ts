import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-052',
  name: '홈 화면을 열면 배너가 노출 배너 응답(/api/banners)의 순서대로 보인다',
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
    const 응답 = (await (await page.request.get('/api/banners')).json()) as { items: { title: string }[] };
    await verify(
      '홈 화면을 열면 배너가 노출 배너 응답(/api/banners)의 순서대로 보인다',
      (await 홈.배너제목들.allInnerTexts()).join(' · '),
      응답.items.map((배너) => 배너.title).join(' · '),
    );
  });
});
