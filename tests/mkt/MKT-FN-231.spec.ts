import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 세션아이디, 시드글번호, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 권한없음화면 } from './pages/forbidden.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-231',
  name: '작성자가 아닌 회원이 수정 주소로 들어오면 「권한이 없습니다」 화면이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 권한없음 = new 권한없음화면(page);
    let 남의글번호 = 0;

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      남의글번호 = await 시드글번호(page.request);
    });

    await test.step('로그인을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(page.request)) !== '', true, { blocker: true });
    });

    await test.step('남이 쓴 글의 수정 주소를 연다', async () => {
      await 안내창끄기(page);
      await 권한없음.열기(`/board/${남의글번호}/edit`);
      await verify('작성자가 아닌 회원이 수정 주소로 들어오면 「권한이 없습니다」 화면이 보인다', await 권한없음.제목.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
