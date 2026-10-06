import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-026',
  name: '홈 화면 배너와 탭 사이에 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 이벤트 띠를 기다린다', async () => {
    await 안내창끄기(page);
    await 홈.열기();
    await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업 · 설문은 이미 닫았다', [await 홈.공지팝업.count(), await 홈.설문.count()], [0, 0], { blocker: true });
    await 홈.이벤트띠.waitFor();
    await verify(
      '홈 화면 배너와 탭 사이에 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
      [await 홈.이벤트띠문구.isVisible(), await 홈.이벤트띠가배너와탭사이인가()],
      [true, true],
    );
  });
});
