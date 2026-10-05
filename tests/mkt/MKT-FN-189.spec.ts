import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기 } from './components/data.component.js';
import { 내글만들기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-189',
  name: '없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  precondition: ['비회원이다', '새로 만든 회원으로 로그인해 있다', '방금 지운 내 글이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    let 지운글번호 = 0;

    await test.step('없는 글 번호 「/board/999999」 주소를 연다', async () => {
      await 안내창끄기(page);
      await 상세.없는글열기(999999);
      await verify('없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글문구.isVisible(), true);
    });

    await test.step('새로 만든 회원으로 로그인하고 글을 만든 뒤 지운다', async () => {
      await 회원로그인(page.request, 정리);
      지운글번호 = (await 내글만들기(page.request, 정리)).id;
      await 글지우기(page.request, 지운글번호);
    });

    await test.step('로그인과 지운 글을 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await 세션아이디(page.request)) !== '', true, { blocker: true });
      await verify('방금 지운 내 글이 있다', (await page.request.get(`/api/posts/${지운글번호}`)).status(), 404, { blocker: true });
    });

    await test.step('지운 글의 상세 주소를 연다', async () => {
      await 상세.없는글열기(지운글번호);
      await verify('삭제된 글 주소에도 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글문구.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
