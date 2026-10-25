import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 고유낱말, 글올리기, 요청로그인한일회용회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-360',
  name: '내 글을 PUT 으로 고치면 다시 조회한 글의 제목이 바뀌어 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 글번호 = 0;
  const 본문 = '고쳐 볼 글의 본문입니다 열 글자가 넘습니다';

  try {
    await test.step('POST /api/posts 로 글을 만들고 PUT 으로 제목을 고친다', async () => {
      await 요청로그인한일회용회원(request);
      글번호 = await 글올리기(request, { 제목: 고유낱말('고치기전'), 본문 });
      const 새제목 = 고유낱말('고친뒤');
      const 응답 = await request.put(`/api/posts/${글번호}`, { data: { category: '자유', title: 새제목, content: 본문, images: [] } });
      await verify('PUT 응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 다시 = await request.get(`/api/posts/${글번호}`);
      const 몸 = (await 다시.json()) as { title?: string };
      await verify('내 글을 PUT 으로 고치면 다시 조회한 글의 제목이 바뀌어 있다', 몸.title, 새제목);
    });

    await test.step('DELETE /api/posts/{id} 로 내 글을 지운 뒤 다시 조회한다', async () => {
      const 지움 = await request.delete(`/api/posts/${글번호}`);
      await verify('DELETE 응답 코드가 204다', 지움.status(), 204, { blocker: true });
      const 다시 = await request.get(`/api/posts/${글번호}`);
      await verify('내 글을 DELETE 로 지우면 그 글을 다시 조회할 때 404 다', 다시.status(), 404);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
