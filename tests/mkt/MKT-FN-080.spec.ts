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
  tcId: 'MKT-FN-080',
  name: '글 API 로 읽기 · 쓰기 · 고치기 · 지우기 · 좋아요가 규칙대로 응답한다',
  platforms: ['desktop'],
  precondition: [
    '회원 계정으로 로그인해 있다',
    '이번 실행에서 만든 글이 있다',
    '좋아요를 누르지 않은 글이 있다',
    '관리자 계정으로 로그인해 있다',
    '회원이 이번 실행에서 만든 글이 있다',
  ],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
    title: z.string().min(1).describe('만들 글 제목').default('글 API 시험용 글입니다'),
    editedTitle: z.string().min(1).describe('고칠 제목').default('글 API 시험용 글을 고쳤습니다'),
    content: z.string().min(1).describe('글 본문').default('글 API 시험용 본문입니다. 열 글자를 넘깁니다.'),
  }),
  expected: z.object({
    readStatus: z.number().describe('조회 응답 코드').default(200),
    createStatus: z.number().describe('생성 응답 코드').default(201),
    like: z.string().describe('좋아요 두 번의 응답 값').default('true, number, false'),
    memberDelete: z.string().describe('본인 삭제 응답 코드와 본문 길이').default('204, 0'),
    adminDelete: z.string().describe('관리자 삭제 응답 코드와 이후 조회 응답 코드').default('204, 404'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 아이디 = await 가입한다(request);
  const 본문 = { category: '자유', title: params.title, content: params.content, images: [] };
  let 글번호 = 0;

  try {
    await test.step('이번 실행에서 쓸 회원과 관리자를 로그인시킨다', async () => {
      await 로그인한다(request, 아이디);
      const res = await page.request.post('/api/auth/login', { data: { loginId: params.adminId, password: params.adminPassword ?? '' } });
      if (res.status() !== 200) throw new Error(`관리자 로그인 응답이 ${res.status()}이다`);
    });

    await test.step('로그인 상태를 확인한다', async () => {
      const 세션 = (await (await request.get('/api/session')).json()) as { user: { loginId: string } | null };
      await verify('회원 계정으로 로그인해 있다', 세션.user?.loginId, 아이디, { blocker: true });
    });

    await test.step('글 목록을 GET /api/posts 로 읽는다', async () => {
      const res = await request.get('/api/posts');
      await verify('조회는 200 으로 응답한다', res.status(), expected.readStatus);
    });

    await test.step('POST /api/posts 로 글을 만든다', async () => {
      const res = await request.post('/api/posts', { data: 본문 });
      글번호 = ((await res.json()) as { id: number }).id;
      await verify('생성은 201 로 응답한다', res.status(), expected.createStatus);
    });

    await test.step('PUT /api/posts/{id} 로 제목을 고친다', async () => {
      await request.put(`/api/posts/${글번호}`, { data: { ...본문, title: params.editedTitle } });
      const 조회 = (await (await request.get(`/api/posts/${글번호}`)).json()) as { title: string };
      await verify('PUT /api/posts/{id} 로 본인 글을 고치면 고친 제목이 GET 응답에 나온다', 조회.title, params.editedTitle);
    });

    await test.step('POST /api/posts/{id}/like 를 두 번 부른다', async () => {
      const 첫째 = (await (await request.post(`/api/posts/${글번호}/like`)).json()) as { liked: boolean; likes: unknown };
      const 둘째 = (await (await request.post(`/api/posts/${글번호}/like`)).json()) as { liked: boolean };
      await verify('POST /api/posts/{id}/like 는 좋아요를 토글하고 {"liked":true,"likes":N} 로 응답한다', [첫째.liked, typeof 첫째.likes, 둘째.liked].join(', '), expected.like);
    });

    await test.step('DELETE /api/posts/{id} 로 그 글을 지운다', async () => {
      const 본인삭제 = await request.delete(`/api/posts/${글번호}`);
      await verify('삭제는 본문 없이 204 로 응답한다', [본인삭제.status(), (await 본인삭제.text()).length].join(', '), expected.memberDelete);
      const 남의글 = ((await (await request.post('/api/posts', { data: 본문 })).json()) as { id: number }).id;
      const 관리자삭제 = await page.request.delete(`/api/posts/${남의글}`);
      const 이후조회 = await request.get(`/api/posts/${남의글}`);
      await verify('관리자는 DELETE /api/posts/{id} 로 남의 글을 삭제할 수 있다', [관리자삭제.status(), 이후조회.status()].join(', '), expected.adminDelete);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
