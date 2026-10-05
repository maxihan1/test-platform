import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-025',
  name: '탭 위에 「타임세일 종료까지 HH:MM:SS」 카운트다운이 보인다',
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
      '탭 위에 「타임세일 종료까지 HH:MM:SS」 카운트다운이 보인다',
      [/^타임세일 종료까지 \d\d:\d\d:\d\d$/.test((await 홈.카운트다운.innerText()).trim()), await 홈.시계가탭위인가()],
      [true, true],
    );
  });
});
