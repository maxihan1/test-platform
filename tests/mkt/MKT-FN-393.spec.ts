import { defineCase, test, verify } from '@platform/kit';
import { 로그아웃요청, 로그인요청, 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-393',
  name: '게시글 상세를 다시 부르면 조회수가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('새 회원이 쓴 글을 하나 만들어 둔다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('조회수 글'), content: '조회수가 오르는지 보려고 쓴 글입니다' });
      await 로그아웃요청(request);
    });

    await test.step('비회원 상태를 확인한다', async () => {
      await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
    });

    await test.step('GET /api/posts/{id} 를 두 번 부른다', async () => {
      const 처음 = (await (await request.get(`/api/posts/${준비.글번호}`)).json()) as { views: number };
      const 다시 = (await (await request.get(`/api/posts/${준비.글번호}`)).json()) as { views: number };
      await verify('게시글 상세를 다시 부르면 조회수가 1 오른다', 다시.views - 처음.views, 1);
    });
  } finally {
    if (준비.회원 && 준비.글번호 !== undefined) {
      await 로그인요청(request, 준비.회원.loginId, 준비.회원.password);
      await 글지우기(request, 준비.글번호);
    }
    await 회원과주문정리(request, 준비.회원);
  }
});
