import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글지우기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-394',
  name: '자기 글은 POST · PUT · DELETE 로 만들고 고치고 지울 수 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('글을 만들고 PUT 으로 고친 뒤 DELETE 로 지운다', async () => {
      const 만들기 = await request.post('/api/posts', { data: { category: '자유', title: 고유글자('내 글'), content: '내가 만들고 고치고 지우는 글입니다' } });
      if (만들기.ok()) 준비.글번호 = ((await 만들기.json()) as { id: number }).id;
      const 고치기 = await request.put(`/api/posts/${준비.글번호}`, { data: { category: '자유', title: 고유글자('고친 글'), content: '내가 고친 글의 내용입니다' } });
      const 지우기 = await request.delete(`/api/posts/${준비.글번호}`);
      if (지우기.ok()) 준비.글번호 = undefined;
      await verify(
        '자기 글은 POST · PUT · DELETE 로 만들고 고치고 지울 수 있다',
        { 만들기: 만들기.ok(), 고치기: 고치기.ok(), 지우기: 지우기.ok() },
        { 만들기: true, 고치기: true, 지우기: true },
      );
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(request, 준비.글번호);
    await 회원과주문정리(request, 준비.회원);
  }
});
