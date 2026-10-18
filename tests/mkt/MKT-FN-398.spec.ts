import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-398',
  name: '댓글 목록에 단 댓글과 parentId 가 그 댓글인 답글이 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('새로 가입한 회원이 글을 하나 쓴다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('댓글 글'), content: '댓글과 답글을 확인하는 글입니다' });
    });

    await test.step('쓴 글이 있는지 확인한다', async () => {
      const 응답 = await request.get(`/api/posts/${준비.글번호}`);
      await verify('쓴 글을 가져올 수 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('댓글을 달고 parentId 로 답글을 단 뒤 GET 으로 댓글 목록을 부른다', async () => {
      const 댓글번호 = await 댓글달기(request, 준비.글번호 ?? 0, '첫 댓글입니다');
      const 답글번호 = await 댓글달기(request, 준비.글번호 ?? 0, '그 댓글의 답글입니다', 댓글번호);
      const 목록 = ((await (await request.get(`/api/posts/${준비.글번호}/comments`)).json()) as { items: { id: number; parentId: number | null }[] }).items;
      await verify(
        '댓글 목록에 단 댓글과 parentId 가 그 댓글인 답글이 있다',
        { 댓글있음: 목록.some((댓글) => 댓글.id === 댓글번호), 답글의부모: 목록.find((댓글) => 댓글.id === 답글번호)?.parentId },
        { 댓글있음: true, 답글의부모: 댓글번호 },
      );
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(request, 준비.글번호);
    await 회원과주문정리(request, 준비.회원);
  }
});
