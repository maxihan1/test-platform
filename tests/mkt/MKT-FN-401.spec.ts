import { defineCase, test, verify } from '@platform/kit';
import { 로그아웃요청, 로그인요청, 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-401',
  name: '남의 댓글 삭제 요청은 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 쓴 댓글이 하나 있다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 회원요청 = page.request;
  const 준비: { 쓴이?: 회원정보; 나?: 회원정보; 글번호?: number; 댓글번호?: number } = {};

  try {
    await test.step('새로 가입한 회원이 글과 댓글을 하나씩 쓴다', async () => {
      준비.쓴이 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('남의 댓글 글'), content: '남이 쓴 댓글을 지우려는 글입니다' });
      준비.댓글번호 = await 댓글달기(request, 준비.글번호, '다른 회원이 쓴 댓글입니다');
      준비.나 = await 새회원으로로그인(회원요청);
    });

    await test.step('쓴 댓글이 있는지 확인한다', async () => {
      const 목록 = ((await (await request.get(`/api/posts/${준비.글번호}/comments`)).json()) as { items: { id: number }[] }).items;
      await verify('쓴 댓글이 목록에 있다', 목록.some((댓글) => 댓글.id === 준비.댓글번호), true, { blocker: true });
    });

    await test.step('다른 회원으로 그 댓글을 DELETE 로 지운다', async () => {
      const 응답 = await 회원요청.delete(`/api/comments/${준비.댓글번호}`);
      await verify('남의 댓글 삭제 요청은 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('로그인 없이 댓글 수정 요청을 보낸다', async () => {
      await 로그아웃요청(request);
      await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
      const 응답 = await request.put(`/api/comments/${준비.댓글번호}`, { data: { content: '비회원이 고친 댓글입니다' } });
      await verify('비로그인 댓글 수정 요청은 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    if (준비.쓴이 && 준비.글번호 !== undefined) {
      await 로그인요청(request, 준비.쓴이.loginId, 준비.쓴이.password);
      await 글지우기(request, 준비.글번호);
    }
    await 회원과주문정리(request, 준비.쓴이);
    await 회원과주문정리(회원요청, 준비.나);
  }
});
