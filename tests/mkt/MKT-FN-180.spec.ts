import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-180',
  name: '남의 글 상세에는 「수정」 · 「삭제」 버튼이 보이지 않는다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
    });

    await test.step('남이 쓴 게시글 상세를 연다', async () => {
      await 안내창끄기(page);
      await 상세.열기(await 시드글번호(page.request));
      await verify('남이 쓴 글 상세에 좋아요 버튼이 보인다', await 상세.좋아요버튼.isVisible(), true, { blocker: true });
      const 안보임 = !(await 상세.수정링크.isVisible()) && !(await 상세.삭제버튼.isVisible());
      await verify('남의 글 상세에는 「수정」 · 「삭제」 버튼이 보이지 않는다', 안보임, true);
    });
  } finally {
    await 정리.비우기();
  }
});
