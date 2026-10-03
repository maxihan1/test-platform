import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';

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

export const spec = defineCase({
  tcId: 'MKT-UI-024',
  name: '로그인 회원에게 댓글 입력칸의 글자 수와 내 댓글의 「수정」 · 「삭제」가 보인다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다', '내 댓글이 있는 글이다'],
  params: z.object({
    title: z.string().min(1).describe('글 제목').default('댓글 화면 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('댓글 화면 시험용 본문입니다. 열 글자를 넘깁니다.'),
    comment: z.string().min(1).describe('내 댓글 내용').default('내가 쓴 시험 댓글입니다'),
  }),
  expected: z.object({
    counter: z.string().describe('댓글 입력칸 글자 수').default('0/300'),
    tools: z.string().describe('내 댓글의 수정 · 삭제 버튼이 보이는지').default('true, true'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 아이디 = await 가입한다(request);
  let 글번호 = 0;

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글과 댓글을 쓴다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      const 글 = await page.request.post('/api/posts', { data: { category: '자유', title: params.title, content: params.content, images: [] } });
      글번호 = ((await 글.json()) as { id: number }).id;
      await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: params.comment, parentId: null } });
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 머리.로그아웃.waitFor();
      await verify('회원 계정으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('글 상세 화면을 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글(params.comment).waitFor();
      await verify('로그인 회원에게는 댓글 입력칸 오른쪽 아래에 「0/300」 형식의 글자 수가 보인다', await 상세.새댓글글자수.innerText(), expected.counter);
      await verify(
        '내 댓글에는 「수정」 · 「삭제」가 보인다',
        [await 상세.수정버튼(params.comment).isVisible(), await 상세.삭제버튼(params.comment).isVisible()].join(', '),
        expected.tools,
      );
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
