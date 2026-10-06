import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 내글만들기, 댓글목록받기, 댓글여럿달기, 세션아이디, 정리함, 회원로그인 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-453',
  name: '본인 댓글이 아니면 수정 요청이 403 으로 응답한다',
  precondition: ['새로 만든 회원 둘이 있다', '첫째 회원의 댓글이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 정리 = new 정리함();
  try {
    let 댓글번호 = 0;
    let 글번호 = 0;

    await test.step('새로 만든 회원 둘로 로그인하고 첫째 회원의 댓글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      await 회원로그인(request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
      댓글번호 = (await 댓글여럿달기(page.request, 글번호, [고유이름('댓글')]))[0] ?? 0;
    });

    await test.step('두 회원과 첫째 회원의 댓글을 확인한다', async () => {
      await verify('새로 만든 회원 둘이 있다', { 첫째: (await 세션아이디(page.request)) !== '', 둘째: (await 세션아이디(request)) !== '' }, { 첫째: true, 둘째: true }, { blocker: true });
      await verify('첫째 회원의 댓글이 있다', (await 댓글목록받기(page.request, 글번호)).some((댓글) => 댓글.id === 댓글번호), true, { blocker: true });
    });

    await test.step('둘째 회원으로 첫째 회원의 댓글에 PUT 을 보낸다', async () => {
      const res = await request.put(`/api/comments/${댓글번호}`, { data: { content: 고유이름('남이고친댓글') } });
      await verify('본인 댓글이 아니면 수정 요청이 403 으로 응답한다', res.status(), 403);
    });

    await test.step('둘째 회원으로 첫째 회원의 댓글에 DELETE 를 보낸다', async () => {
      const res = await request.delete(`/api/comments/${댓글번호}`);
      await verify('본인 댓글이 아니면 삭제 요청이 403 으로 응답한다', res.status(), 403);
    });
  } finally {
    await 정리.비우기();
  }
});
