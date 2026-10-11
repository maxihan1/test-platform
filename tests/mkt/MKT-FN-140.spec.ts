import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 댓글목록읽기 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-140',
  name: '게시글 목록을 분류 · 정렬 · 쪽을 넣어 요청하면 그 조건에 맞는 목록이 온다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await verify('로그인 응답 코드가 200이다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
      await 지난글치우기(request, 글머리(spec.tcId));
      글번호 = await 글만들기(request, { title: 고유제목(spec.tcId, '요청') });
      await verify('글 번호가 정해졌다', 글번호 > 0, true, { blocker: true });
    });

    await test.step('게시글 목록 API 를 category · sort · page · size 를 넣어 요청한다', async () => {
      const 응답 = await request.get('/api/posts', { params: { category: '질문', sort: 'views', page: 2, size: 5 } });
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 본문 = (await 응답.json()) as { items: { category: string; views: number }[]; page: number; size: number };
      const 조회수들 = 본문.items.map((글) => 글.views);
      await verify(
        '게시글 목록을 분류 · 정렬 · 쪽을 넣어 요청하면 그 조건에 맞는 목록이 온다',
        {
          분류: 본문.items.length > 0 && 본문.items.every((글) => 글.category === '질문'),
          정렬: 조회수들.every((값, 순서) => 순서 === 0 || 조회수들[순서 - 1] >= 값),
          쪽: 본문.page,
          건수: 본문.items.length,
        },
        { 분류: true, 정렬: true, 쪽: 2, 건수: 5 },
      );
    });

    await test.step('게시글 상세 API 를 두 번 요청한다', async () => {
      const 첫째 = (await (await request.get(`/api/posts/${글번호}`)).json()) as { views: number };
      const 둘째 = (await (await request.get(`/api/posts/${글번호}`)).json()) as { views: number };
      await verify('게시글 상세를 두 번 요청하면 조회수가 1 오른다', 둘째.views - 첫째.views, 1);
    });

    await test.step('게시글 작성 · 수정 · 삭제 API 를 차례로 요청한다', async () => {
      const 글 = { category: '자유', title: 고유제목(spec.tcId, '작성'), content: '작성 수정 삭제를 차례로 요청하는 글입니다.', images: [] };
      const 작성 = await request.post('/api/posts', { data: 글 });
      const 만든번호 = ((await 작성.json()) as { id: number }).id;
      const 수정 = await request.put(`/api/posts/${만든번호}`, { data: { ...글, title: 고유제목(spec.tcId, '수정') } });
      const 삭제 = await request.delete(`/api/posts/${만든번호}`);
      await verify('내 글을 작성 · 수정 · 삭제 요청하면 차례로 201 · 200 · 204 로 응답한다', [작성.status(), 수정.status(), 삭제.status()], [201, 200, 204]);
    });

    await test.step('좋아요 API 를 두 번 요청한다', async () => {
      const 첫째 = (await (await request.post(`/api/posts/${글번호}/like`)).json()) as { liked: boolean; likes: number };
      const 둘째 = (await (await request.post(`/api/posts/${글번호}/like`)).json()) as { liked: boolean };
      await verify(
        '좋아요를 요청하면 liked 와 likes 가 든 응답이 오고 다시 요청하면 liked 가 뒤집힌다',
        { 첫째키: Object.keys(첫째).sort(), 첫째liked: 첫째.liked, 첫째likes형: typeof 첫째.likes, 둘째liked: 둘째.liked },
        { 첫째키: ['liked', 'likes'], 첫째liked: true, 첫째likes형: 'number', 둘째liked: false },
      );
    });

    await test.step('댓글 작성 API 를 parentId 를 넣어 요청하고 댓글 목록 API 를 요청한다', async () => {
      const 댓글번호 = await 댓글달기(request, 글번호, '부모 댓글');
      const 답글번호 = await 댓글달기(request, 글번호, '답글', 댓글번호);
      const 목록 = await 댓글목록읽기(request, 글번호);
      await verify('parentId 를 넣어 댓글을 작성하면 댓글 목록에 그 답글이 든다', 목록.some((댓글) => 댓글.id === 답글번호 && 댓글.parentId === 댓글번호), true);
    });

    await test.step('내 댓글 수정 · 삭제 API 를 차례로 요청한다', async () => {
      const 댓글번호 = await 댓글달기(request, 글번호, '고칠 댓글');
      const 수정 = await request.put(`/api/comments/${댓글번호}`, { data: { content: '고친 댓글' } });
      const 삭제 = await request.delete(`/api/comments/${댓글번호}`);
      await verify('내 댓글을 수정 · 삭제 요청하면 200 · 204 로 응답한다', [수정.status(), 삭제.status()], [200, 204]);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
    await 지난글치우기(request, 글머리(spec.tcId));
  }
});
