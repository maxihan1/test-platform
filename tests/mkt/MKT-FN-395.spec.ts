import { defineCase, test, verify } from '@platform/kit';
import { 로그아웃요청, 로그인요청, 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-395',
  name: '비로그인 글 작성 요청은 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 회원요청 = page.request;
  const 준비: { 쓴이?: 회원정보; 나?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('비회원 상태를 확인한다', async () => {
      await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
    });

    await test.step('로그인 없이 POST /api/posts 를 부른다', async () => {
      const 응답 = await request.post('/api/posts', { data: { category: '자유', title: '비회원 글', content: '비회원이 쓰려는 글의 내용입니다' } });
      await verify('비로그인 글 작성 요청은 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('회원으로 로그인한다', async () => {
      준비.쓴이 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('남의 글'), content: '다른 회원이 쓴 글의 내용입니다' });
      await 로그아웃요청(request);
      준비.나 = await 새회원으로로그인(회원요청);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(회원요청), true, { blocker: true });
    });

    await test.step('다른 회원 글을 DELETE 로 지운다', async () => {
      const 응답 = await 회원요청.delete(`/api/posts/${준비.글번호}`);
      await verify('남의 글 삭제 요청은 403 으로 응답한다', 응답.status(), 403);
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
