import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';
import { 글쓰기 } from './pages/board-write.page.js';

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
  tcId: 'MKT-UI-021',
  name: '작성자 본인에게만 「수정」 · 「삭제」 버튼이 보이고 수정 화면에 기존 내용이 채워져 있다',
  platforms: ['desktop'],
  precondition: ['작성자 본인이 로그인해 있다', '작성자가 아닌 회원이 로그인해 있다'],
  params: z.object({
    category: z.string().min(1).describe('글 분류').default('자유'),
    title: z.string().min(1).describe('글 제목').default('시험용 글 제목입니다'),
    content: z.string().min(1).describe('글 본문').default('시험용 글 본문입니다. 열 글자를 넘깁니다.'),
    otherPostId: z.number().describe('남이 쓴 글 번호').default(47),
  }),
  expected: z.object({
    ownButtons: z.string().describe('본인 글의 수정 · 삭제 버튼이 보이는지').default('true, true'),
    otherButtons: z.string().describe('남의 글의 수정 · 삭제 버튼이 보이는지').default('false, false'),
    filled: z.string().describe('수정 화면에 채워진 분류 · 제목 · 본문').default('true, true, true'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 쓰기 = new 글쓰기(page);
  const 아이디 = await 가입한다(request);
  let 글번호 = 0;

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글을 쓴다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      const res = await page.request.post('/api/posts', {
        data: { category: params.category, title: params.title, content: params.content, images: [] },
      });
      글번호 = ((await res.json()) as { id: number }).id;
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 머리.로그아웃.waitFor();
      await verify('작성자 본인이 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('본인이 쓴 글의 상세 화면을 연다', async () => {
      await 상세.열기(글번호);
      await 상세.좋아요.waitFor();
      await verify(
        '작성자 본인에게는 「수정」 · 「삭제」 버튼이 보인다',
        [await 상세.수정.isVisible(), await 상세.삭제.isVisible()].join(', '),
        expected.ownButtons,
      );
    });

    await test.step('남이 쓴 글의 상세 화면을 연다', async () => {
      await 상세.열기(params.otherPostId);
      await 상세.좋아요.waitFor();
      await verify(
        '작성자가 아닌 회원에게는 「수정」 · 「삭제」 버튼이 보이지 않는다',
        [await 상세.수정.isVisible(), await 상세.삭제.isVisible()].join(', '),
        expected.otherButtons,
      );
    });

    await test.step('본인 글의 수정 화면을 연다', async () => {
      await 쓰기.열기(`/board/${글번호}/edit`);
      await 쓰기.제목글자수.filter({ hasText: `${params.title.length}/50` }).waitFor();
      await verify(
        '수정 화면에는 글쓰기와 같은 모양에 기존 내용이 채워져 있다',
        [
          (await 쓰기.분류선택.innerText()) === params.category,
          (await 쓰기.제목칸.inputValue()) === params.title,
          (await 쓰기.본문칸.inputValue()) === params.content,
        ].join(', '),
        expected.filled,
      );
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
