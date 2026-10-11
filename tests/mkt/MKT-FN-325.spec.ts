import { defineCase, test, verify } from '@platform/kit';

import { 댓글달기 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이, 둘째회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-325',
  name: 'GET /api/notifications 는 알림 목록과 읽지 않은 수를 돌려준다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 남!: 둘째회원;

  try {
    await test.step('회원으로 로그인해 내 글에 다른 회원이 댓글을 단다', async () => {
      나 = await 임시회원으로로그인(request);
      정리.더하기(() => 글쓴이정리하기(나));
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      const 글 = await 글하나쓰기(나.api, '알림글');
      await 댓글달기(남.api, 글.id, '알림을 만든 댓글');
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(request), true, { blocker: true });
    });

    await test.step('GET /api/notifications 를 부른다', async () => {
      const 본문 = (await (await request.get('/api/notifications')).json()) as { items?: unknown[]; unread?: unknown };
      await verify('GET /api/notifications 는 알림 목록과 읽지 않은 수를 돌려준다', Array.isArray(본문.items) && 본문.items.length > 0 && 본문.unread === 1, true);
    });

    await test.step('POST /api/notifications/read 뒤 GET /api/notifications 를 부른다', async () => {
      await request.post('/api/notifications/read');
      const 본문 = (await (await request.get('/api/notifications')).json()) as { unread?: number };
      await verify('모두 읽음을 부르면 읽지 않은 수가 0 이다', 본문.unread, 0);
    });
  } finally {
    await 정리.모두하기();
  }
});
