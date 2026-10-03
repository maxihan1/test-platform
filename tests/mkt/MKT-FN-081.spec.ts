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
  tcId: 'MKT-FN-081',
  name: '글 API 의 오류는 상태 코드와 code · message 로 응답한다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다', '비회원이다'],
  params: z.object({
    otherPostId: z.number().describe('남이 쓴 글 번호').default(48),
    missingPostId: z.number().describe('없는 글 번호').default(9999),
  }),
  expected: z.object({
    validation: z.string().describe('입력 오류의 응답 코드와 code 와 message 종류').default('400, VALIDATION, string'),
    unauthorized: z.string().describe('로그인 없는 요청의 응답 코드와 code').default('401, UNAUTHORIZED'),
    forbidden: z.string().describe('권한 없는 요청의 응답 코드와 code').default('403, FORBIDDEN'),
    notFound: z.string().describe('없는 글의 응답 코드와 code').default('404, NOT_FOUND'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 아이디 = await 가입한다(request);
  const 본문 = { category: '자유', title: '오류 시험용 글입니다', content: '오류 시험용 본문입니다. 열 글자를 넘깁니다.', images: [] };

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시킨다', async () => {
      await 로그인한다(request, 아이디);
    });

    await test.step('로그인 상태를 확인한다', async () => {
      const 세션 = (await (await request.get('/api/session')).json()) as { user: { loginId: string } | null };
      await verify('회원 계정으로 로그인해 있다', 세션.user?.loginId, 아이디, { blocker: true });
    });

    await test.step('POST /api/posts 에 제목이 빈 값인 본문을 보낸다', async () => {
      const res = await request.post('/api/posts', { data: { ...본문, title: '' } });
      const 응답 = (await res.json()) as { code: string; message: unknown };
      await verify('입력 오류는 400 과 {"code":"VALIDATION","message":"..."} 로 응답한다', [res.status(), 응답.code, typeof 응답.message].join(', '), expected.validation);
    });

    await test.step('POST /api/posts 를 로그인 없이 부른다', async () => {
      const res = await page.request.post('/api/posts', { data: 본문 });
      const 응답 = (await res.json()) as { code: string };
      await verify('로그인이 필요한 요청은 401 과 code UNAUTHORIZED 로 응답한다', [res.status(), 응답.code].join(', '), expected.unauthorized);
    });

    await test.step('남이 쓴 글을 PUT /api/posts/{id} 로 고친다', async () => {
      const res = await request.put(`/api/posts/${params.otherPostId}`, { data: 본문 });
      const 응답 = (await res.json()) as { code: string };
      await verify('권한이 없는 요청은 403 과 code FORBIDDEN 으로 응답한다', [res.status(), 응답.code].join(', '), expected.forbidden);
    });

    await test.step('없는 글 번호를 GET /api/posts/{id} 로 읽는다', async () => {
      const res = await request.get(`/api/posts/${params.missingPostId}`);
      const 응답 = (await res.json()) as { code: string; message: string };
      await verify('없는 글은 404 와 code NOT_FOUND 로 응답한다', [res.status(), 응답.code].join(', '), expected.notFound);
      await verify('실패 응답의 message 는 화면에 그대로 보여 주는 한국어 문장이다', /[가-힣]/.test(응답.message), true);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
