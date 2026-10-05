import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-128',
  name: '고객센터 아래쪽 「오시는 길」에 지도가 든 틀이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 고객 = new 고객센터화면(page);

  await test.step('고객센터 화면을 연다', async () => {
    await 안내창끄기(page);
    await 고객.열기();
    await verify('비회원이다', await 고객.머리글.로그인링크.isVisible(), true, { blocker: true });
    await 고객.지도그림.waitFor();
    await verify(
      '고객센터 아래쪽 「오시는 길」에 지도가 든 틀이 보인다',
      [await 고객.오시는길제목.isVisible(), await 고객.지도틀.isVisible(), await 고객.지도그림.isVisible(), await 고객.지도틀이FAQ아래인가()],
      [true, true, true, true],
    );
  });
});
