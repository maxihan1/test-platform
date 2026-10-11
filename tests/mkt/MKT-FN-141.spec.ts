import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 둘째회원문맥, 익명문맥 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-141',
  name: '로그인 없이 글 작성을 요청하면 401 로 응답한다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다', '회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 익명 = await 익명문맥();
  const 둘째 = await 둘째회원문맥(params.password ?? '');
  let 글번호 = 0;
  let 댓글번호 = 0;

  try {
    await test.step('회원으로 로그인하고 두 번째 회원이 글과 댓글을 만든다', async () => {
      await verify('로그인 응답 코드가 200이다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
      await 지난글치우기(둘째, 글머리(spec.tcId));
      글번호 = await 글만들기(둘째, { title: 고유제목(spec.tcId, '남의 글') });
      댓글번호 = await 댓글달기(둘째, 글번호, '남의 댓글');
      await verify('두 번째 회원이 만든 글과 댓글의 번호가 정해졌다', 글번호 > 0 && 댓글번호 > 0, true, { blocker: true });
    });

    await test.step('로그인 없이 게시글 작성 API 를 요청한다', async () => {
      const 응답 = await 익명.post('/api/posts', { data: { category: '자유', title: '로그인 없이 쓰는 글', content: '로그인 없이 쓰는 글의 본문입니다.', images: [] } });
      await verify('로그인 없이 글 작성을 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('남의 글 수정 API 를 요청한다', async () => {
      const 응답 = await request.put(`/api/posts/${글번호}`, { data: { category: '자유', title: '남의 글을 고치는 제목', content: '남의 글을 고치는 본문입니다.', images: [] } });
      await verify('남의 글 수정을 요청하면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('로그인 없이 좋아요 API 를 요청한다', async () => {
      const 응답 = await 익명.post(`/api/posts/${글번호}/like`);
      await verify('로그인 없이 좋아요를 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('로그인 없이 댓글 목록과 댓글 작성 API 를 요청한다', async () => {
      const 목록 = await 익명.get(`/api/posts/${글번호}/comments`);
      const 작성 = await 익명.post(`/api/posts/${글번호}/comments`, { data: { content: '로그인 없이 쓰는 댓글', parentId: null } });
      await verify('로그인 없이 댓글 목록은 200 으로 오고 댓글 작성은 401 로 응답한다', [목록.status(), 작성.status()], [200, 401]);
    });

    await test.step('로그인 없이 댓글 수정 API 를 요청한다', async () => {
      const 응답 = await 익명.put(`/api/comments/${댓글번호}`, { data: { content: '로그인 없이 고치는 댓글' } });
      await verify('로그인 없이 댓글 수정을 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('남의 댓글 삭제 API 를 요청한다', async () => {
      const 응답 = await request.delete(`/api/comments/${댓글번호}`);
      await verify('남의 댓글 삭제를 요청하면 403 으로 응답한다', 응답.status(), 403);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(둘째, 글번호);
    await 지난글치우기(둘째, 글머리(spec.tcId));
    await 익명.dispose();
    await 둘째.dispose();
  }
});
