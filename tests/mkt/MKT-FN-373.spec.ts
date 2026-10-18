import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글지우기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-373',
  name: '목록 조회는 200 과 JSON 본문으로 응답한다',
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

    await test.step('GET /api/posts 를 부른다', async () => {
      const 응답 = await request.get('/api/posts');
      const 본문 = await 응답.json().then(() => true, () => false);
      await verify('목록 조회는 200 과 JSON 본문으로 응답한다', { 상태: 응답.status(), JSON본문: 본문 }, { 상태: 200, JSON본문: true });
    });

    await test.step('POST /api/posts 로 글을 만든다', async () => {
      const 응답 = await request.post('/api/posts', { data: { category: '자유', title: 고유글자('글 생성'), content: '글 생성 응답을 확인하는 글입니다' } });
      if (응답.status() === 201) 준비.글번호 = ((await 응답.json()) as { id: number }).id;
      await verify('글 생성은 201 로 응답한다', 응답.status(), 201, { blocker: true });
    });

    await test.step('만든 글을 DELETE /api/posts/{id} 로 지운다', async () => {
      const 응답 = await request.delete(`/api/posts/${준비.글번호}`);
      await verify('글 삭제는 204 로 본문 없이 응답한다', { 상태: 응답.status(), 본문: await 응답.text() }, { 상태: 204, 본문: '' });
      준비.글번호 = undefined;
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(request, 준비.글번호);
    await 회원과주문정리(request, 준비.회원);
  }
});
