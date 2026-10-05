import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 댓글달기 } from './components/data.component.js';
import { 고유이름, 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-487',
  name: '알림 목록은 읽지 않은 수 1과 함께 온다',
  precondition: ['새로 만든 회원 둘이 있다', '첫째 회원의 글에 둘째 회원이 댓글을 달았다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 정리 = new 정리함();
  try {
    await test.step('새로 만든 회원 둘로 로그인하고 둘째 회원이 첫째 회원의 글에 댓글을 단다', async () => {
      await 회원로그인(request, 정리);
      await 회원로그인(page.request, 정리);
      const 글번호 = (await 내글만들기(request, 정리)).id;
      await 댓글달기(page.request, 글번호, 고유이름('남이단댓글'));
    });

    await test.step('첫째 회원으로 알림 목록 /api/notifications 를 부른다', async () => {
      const res = await request.get('/api/notifications');
      await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
      await verify('알림 목록은 읽지 않은 수 1과 함께 온다', ((await res.json()) as { unread: number }).unread, 1);
    });

    await test.step('모두 읽음 POST /api/notifications/read 를 보내고 알림 목록을 다시 부른다', async () => {
      await request.post('/api/notifications/read');
      const res = await request.get('/api/notifications');
      await verify('모두 읽음 뒤 읽지 않은 수가 0이다', ((await res.json()) as { unread: number }).unread, 0);
    });
  } finally {
    await 정리.비우기();
  }
});
