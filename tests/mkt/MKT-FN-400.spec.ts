import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-400',
  name: '자기 댓글은 PUT 으로 고치고 DELETE 로 지울 수 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 댓글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 글번호?: number; 댓글번호?: number } = {};

  try {
    await test.step('새로 가입한 회원이 글과 댓글을 하나씩 쓴다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('내 댓글 글'), content: '내 댓글을 고치고 지우는 글입니다' });
      준비.댓글번호 = await 댓글달기(request, 준비.글번호, '내가 쓴 댓글입니다');
    });

    await test.step('쓴 댓글이 있는지 확인한다', async () => {
      const 목록 = ((await (await request.get(`/api/posts/${준비.글번호}/comments`)).json()) as { items: { id: number }[] }).items;
      await verify('쓴 댓글이 목록에 있다', 목록.some((댓글) => 댓글.id === 준비.댓글번호), true, { blocker: true });
    });

    await test.step('자기 댓글을 PUT 으로 고치고 DELETE 로 지운다', async () => {
      const 고치기 = await request.put(`/api/comments/${준비.댓글번호}`, { data: { content: '고친 댓글입니다' } });
      const 지우기 = await request.delete(`/api/comments/${준비.댓글번호}`);
      await verify('자기 댓글은 PUT 으로 고치고 DELETE 로 지울 수 있다', { 고치기: 고치기.ok(), 지우기: 지우기.ok() }, { 고치기: true, 지우기: true });
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(request, 준비.글번호);
    await 회원과주문정리(request, 준비.회원);
  }
});
