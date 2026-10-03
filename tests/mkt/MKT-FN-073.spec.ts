import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
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
  tcId: 'MKT-FN-073',
  name: '댓글을 쓰면 글자 수가 실시간으로 바뀌고 등록하면 목록에 보이고 공백만 쓰면 등록되지 않는다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다', '댓글을 달 글의 상세 화면이다'],
  params: z.object({
    title: z.string().min(1).describe('글 제목').default('댓글 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('댓글 시험용 본문입니다. 열 글자를 넘깁니다.'),
    comment: z.string().min(1).describe('등록할 댓글').default('시험 댓글을 등록합니다'),
  }),
  expected: z.object({
    live: z.string().describe('입력하는 대로 바뀌는 글자 수').default('3/300, 5/300'),
    limit: z.string().describe('301자를 적은 뒤 남은 글자 수와 표시').default('300, 300/300'),
    blankToast: z.string().describe('공백만 등록했을 때 안내').default('댓글 내용을 입력하세요'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 알림 = new 토스트(page);
  const 아이디 = await 가입한다(request);

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글을 써서 상세 화면을 연다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      const 글 = await page.request.post('/api/posts', { data: { category: '자유', title: params.title, content: params.content, images: [] } });
      await 상세.열기(((await 글.json()) as { id: number }).id);
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 상세.새댓글칸.waitFor();
      await verify('회원 계정으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('댓글 입력칸에 글자를 적는다', async () => {
      await 상세.새댓글칸.fill('가나다');
      const 처음 = await 상세.새댓글글자수.innerText();
      await 상세.새댓글칸.pressSequentially('라마');
      await verify('댓글 입력칸의 글자 수는 입력하는 대로 실시간으로 바뀐다', [처음, await 상세.새댓글글자수.innerText()].join(', '), expected.live);
    });

    await test.step('댓글 입력칸에 301자를 적는다', async () => {
      await 상세.새댓글칸.fill('다'.repeat(301));
      await verify(
        '댓글에 301자를 적으면 300자까지만 입력되고 글자 수가 「300/300」으로 보인다',
        [(await 상세.새댓글칸.inputValue()).length, await 상세.새댓글글자수.innerText()].join(', '),
        expected.limit,
      );
    });

    await test.step('댓글 입력칸에 공백만 적고 「등록」을 누른다', async () => {
      await 상세.새댓글칸.fill('   ');
      await 상세.새댓글등록.click();
      await verify('공백만 입력하고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다', await 알림.문구(expected.blankToast).innerText(), expected.blankToast);
      await verify('공백만 입력하고 등록하면 댓글이 등록되지 않는다', await 상세.댓글들.count(), 0);
    });

    await test.step('댓글 입력칸에 글자를 적고 「등록」을 누른다', async () => {
      await 상세.댓글쓴다(params.comment);
      await 상세.댓글제목.filter({ hasText: '댓글 1' }).waitFor();
      await verify('로그인 회원이 댓글을 1자 이상 써서 「등록」하면 댓글이 목록에 보인다', await 상세.댓글(params.comment).isVisible(), true);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
