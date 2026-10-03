import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


const 새회원비밀번호 = 'Mkt!2026pw';

async function 가입한다(request: APIRequestContext): Promise<string> {
  const 아이디 = `mk${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 5)}`;
  const res = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 새회원비밀번호,
      passwordConfirm: 새회원비밀번호,
      name: '시험회원',
      email: `${아이디}@example.com`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (res.status() !== 201) throw new Error(`가입 응답이 ${res.status()}이다`);
  return 아이디;
}

async function 치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  await request.post('/api/auth/login', { data: { loginId: 아이디, password: 새회원비밀번호 } });
  const 나 = (await (await request.get('/api/session')).json()) as { user: { id: number } | null };
  const 목록 = (await (await request.get('/api/posts?field=author&q=시험회원&size=100')).json()) as { items: { id: number; authorId: number }[] };
  for (const 글 of 목록.items) {
    if (글.authorId === 나.user?.id) await request.delete(`/api/posts/${글.id}`);
  }
  await request.delete('/api/me');
}

async function 로그인한다(request: APIRequestContext, 아이디: string): Promise<void> {
  const res = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 새회원비밀번호 } });
  if (res.status() !== 200) throw new Error(`로그인 응답이 ${res.status()}이다`);
}

export const spec = defineCase({
  tcId: 'MKT-FN-085',
  name: '댓글 API 로 읽기 · 쓰기 · 고치기 · 지우기가 규칙대로 응답하고 남의 댓글은 고칠 수 없다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '댓글이 달린 글이 있다', '회원 계정으로 로그인해 있다', '댓글을 달 글이 있다', '내 댓글이 있다', '남이 쓴 댓글이 있다'],
  params: z.object({
    commentedPostId: z.number().describe('댓글이 달린 글 번호').default(48),
    otherCommentId: z.number().describe('남이 쓴 댓글 번호').default(1),
    title: z.string().min(1).describe('만들 글 제목').default('댓글 API 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('댓글 API 시험용 본문입니다. 열 글자를 넘깁니다.'),
    comment: z.string().min(1).describe('쓸 댓글').default('댓글 API 시험 댓글입니다'),
    reply: z.string().min(1).describe('쓸 답글').default('댓글 API 시험 답글입니다'),
    editedComment: z.string().min(1).describe('고칠 댓글').default('댓글 API 시험 댓글을 고쳤습니다'),
  }),
  expected: z.object({
    list: z.string().describe('목록 응답 코드와 items 가 배열인지').default('200, true'),
    created: z.string().describe('댓글과 답글의 응답 코드와 답글의 parentId 가 맞는지').default('201, 201, true'),
    unauthorized: z.number().describe('로그인 없는 쓰기 응답 코드').default(401),
    ownChange: z.string().describe('고치기와 지우기의 응답 코드').default('200, 204'),
    forbidden: z.number().describe('남의 댓글 고치기 응답 코드').default(403),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 아이디 = await 가입한다(request);
  let 글번호 = 0;

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글을 쓴다', async () => {
      await 로그인한다(request, 아이디);
      const 글 = await request.post('/api/posts', { data: { category: '자유', title: params.title, content: params.content, images: [] } });
      글번호 = ((await 글.json()) as { id: number }).id;
    });

    await test.step('로그인 상태를 확인한다', async () => {
      const 세션 = (await (await request.get('/api/session')).json()) as { user: { loginId: string } | null };
      await verify('회원 계정으로 로그인해 있다', 세션.user?.loginId, 아이디, { blocker: true });
    });

    await test.step('GET /api/posts/{id}/comments 를 부른다', async () => {
      const res = await page.request.get(`/api/posts/${params.commentedPostId}/comments`);
      const 응답 = (await res.json()) as { items?: unknown };
      await verify('GET /api/posts/{id}/comments 는 로그인 없이 댓글 목록을 준다', [res.status(), Array.isArray(응답.items)].join(', '), expected.list);
    });

    await test.step('POST /api/posts/{id}/comments 로 댓글을 쓰고 parentId 로 답글을 쓴다', async () => {
      const 댓글 = await request.post(`/api/posts/${글번호}/comments`, { data: { content: params.comment, parentId: null } });
      const 댓글번호 = ((await 댓글.json()) as { id: number }).id;
      const 답글 = await request.post(`/api/posts/${글번호}/comments`, { data: { content: params.reply, parentId: 댓글번호 } });
      const 답글번호 = ((await 답글.json()) as { id: number }).id;
      const 목록 = (await (await request.get(`/api/posts/${글번호}/comments`)).json()) as { items: { id: number; parentId: number | null }[] };
      await verify(
        'POST /api/posts/{id}/comments 로 댓글을 쓰고 parentId 로 답글을 달 수 있다',
        [댓글.status(), 답글.status(), 목록.items.find((c) => c.id === 답글번호)?.parentId === 댓글번호].join(', '),
        expected.created,
      );
    });

    await test.step('POST /api/posts/{id}/comments 를 로그인 없이 부른다', async () => {
      const res = await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: params.comment, parentId: null } });
      await verify('로그인 없이 POST /api/posts/{id}/comments 를 부르면 401 이 온다', res.status(), expected.unauthorized);
    });

    await test.step('PUT /api/comments/{id} 로 댓글을 고치고 DELETE /api/comments/{id} 로 지운다', async () => {
      const 새댓글 = await request.post(`/api/posts/${글번호}/comments`, { data: { content: params.comment, parentId: null } });
      const 번호 = ((await 새댓글.json()) as { id: number }).id;
      const 고침 = await request.put(`/api/comments/${번호}`, { data: { content: params.editedComment } });
      const 삭제 = await request.delete(`/api/comments/${번호}`);
      await verify(
        'PUT /api/comments/{id} 와 DELETE /api/comments/{id} 로 본인 댓글을 고치고 지울 수 있다',
        [고침.status(), 삭제.status()].join(', '),
        expected.ownChange,
      );
    });

    await test.step('PUT /api/comments/{id} 로 남의 댓글을 고친다', async () => {
      const res = await request.put(`/api/comments/${params.otherCommentId}`, { data: { content: params.editedComment } });
      await verify('남의 댓글을 PUT /api/comments/{id} 로 고치면 403 이 온다', res.status(), expected.forbidden);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
