import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-223',
  name: '쓰던 글을 두고 다른 화면으로 가려 하면 브라우저의 나가기 확인 창이 뜬다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
    });

    await test.step('글쓰기 화면에서 제목을 적고 다른 화면 주소로 가려 한다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.확인창받기('dismiss');
      await 쓰기.제목.fill(고유이름('쓰던글'));
      await 쓰기.취소링크.click();
      await verify(
        '쓰던 글을 두고 다른 화면으로 가려 하면 브라우저의 나가기 확인 창이 뜬다',
        쓰기.열린확인창들.map((창) => 창.종류),
        ['beforeunload'],
      );
    });
  } finally {
    await 정리.비우기();
  }
});
