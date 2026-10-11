import { defineCase, test, verify } from '@platform/kit';

import { 표식 } from './helpers/board.helper.js';
import { 글쓴이정리하기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-277',
  name: '조회 GET /api/posts 는 200 으로 응답한다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정리 = 정리함만들기();
  const 제목 = 표식('API글');
  const 본문 = 'API 로 만든 글입니다. 열 글자를 넘깁니다';
  let 나!: 글쓴이;
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(request), true, { blocker: true });
    });

    await test.step('GET /api/posts 를 부른다', async () => {
      const res = await request.get('/api/posts');
      await verify('조회 GET /api/posts 는 200 으로 응답한다', res.status(), 200);
    });

    await test.step('POST /api/posts 로 글을 만든다', async () => {
      const res = await request.post('/api/posts', { data: { category: '자유', title: 제목, content: 본문, images: [] } });
      글번호 = ((await res.json()) as { id?: number }).id ?? 0;
      await verify('생성 POST /api/posts 는 201 로 응답한다', res.status(), 201);
    });

    await test.step('만든 글을 PUT /api/posts/{id} 로 고친다', async () => {
      const res = await request.put(`/api/posts/${String(글번호)}`, { data: { category: '자유', title: `${제목} 수정`, content: 본문, images: [] } });
      await verify('수정 PUT /api/posts/{id} 는 200 으로 응답한다', res.status(), 200);
    });

    await test.step('만든 글을 DELETE /api/posts/{id} 로 지운다', async () => {
      const res = await request.delete(`/api/posts/${String(글번호)}`);
      await verify('삭제 DELETE /api/posts/{id} 는 본문 없이 204 로 응답한다', res.status() === 204 && (await res.text()) === '', true);
    });
  } finally {
    await 정리.모두하기();
  }
});
