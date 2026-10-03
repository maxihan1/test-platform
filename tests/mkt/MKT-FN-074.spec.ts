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
  tcId: 'MKT-FN-074',
  name: '댓글의 「답글」 · 「수정」 · 「삭제」를 누르면 입력칸 · 수정 표시 · 삭제 표시가 규칙대로 나온다',
  platforms: ['desktop'],
  precondition: [
    '회원 계정으로 로그인해 있다',
    '댓글이 달린 글의 상세 화면이다',
    '내 댓글이 있는 글의 상세 화면이다',
    '내 댓글을 수정하는 중이다',
    '답글이 달린 내 댓글이 있다',
    '답글이 없는 내 댓글이 있다',
  ],
  params: z.object({
    title: z.string().min(1).describe('글 제목').default('댓글 동작 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('댓글 동작 시험용 본문입니다. 열 글자를 넘깁니다.'),
    parentComment: z.string().min(1).describe('답글이 달릴 댓글').default('알파 댓글입니다'),
    reply: z.string().min(1).describe('답글 내용').default('베타 답글입니다'),
    soloComment: z.string().min(1).describe('답글이 없는 댓글').default('감마 댓글입니다'),
    editedComment: z.string().min(1).describe('고친 댓글').default('감마 댓글을 고쳤습니다'),
  }),
  expected: z.object({
    editControls: z.string().describe('수정 입력칸 · 저장 · 취소가 보이는지').default('true, true, true'),
    edited: z.string().describe('수정 표시').default('(수정됨)'),
    deleted: z.string().describe('삭제된 댓글 자리 문구와 답글이 보이는지').default('삭제된 댓글입니다, true'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 아이디 = await 가입한다(request);

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글과 댓글과 답글을 쓴다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      const 글 = await page.request.post('/api/posts', { data: { category: '자유', title: params.title, content: params.content, images: [] } });
      const 글번호 = ((await 글.json()) as { id: number }).id;
      const 첫댓글 = await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: params.parentComment, parentId: null } });
      const 첫댓글번호 = ((await 첫댓글.json()) as { id: number }).id;
      await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: params.reply, parentId: 첫댓글번호 } });
      await page.request.post(`/api/posts/${글번호}/comments`, { data: { content: params.soloComment, parentId: null } });
      await 상세.열기(글번호);
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 상세.댓글(params.soloComment).waitFor();
      await verify('회원 계정으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('댓글의 「답글」 버튼을 누른다', async () => {
      await 상세.답글버튼(params.parentComment).click();
      await 상세.답글등록(params.parentComment).waitFor();
      await verify('댓글의 「답글」 버튼을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다', await 상세.답글칸(params.parentComment).isVisible(), true);
    });

    await test.step('내 댓글의 「수정」을 누른다', async () => {
      await 상세.수정버튼(params.soloComment).click();
      await 상세.저장버튼(params.soloComment).waitFor();
      await verify(
        '내 댓글의 「수정」을 누르면 그 자리에서 입력칸으로 바뀌고 「저장」 · 「취소」가 나온다',
        [await 상세.수정칸(params.soloComment).isVisible(), await 상세.저장버튼(params.soloComment).isVisible(), await 상세.취소버튼(params.soloComment).isVisible()].join(', '),
        expected.editControls,
      );
    });

    await test.step('입력칸의 내용을 고치고 「저장」을 누른다', async () => {
      await 상세.수정칸(params.soloComment).fill(params.editedComment);
      await 상세.저장버튼(params.soloComment).click();
      await 상세.댓글(params.editedComment).waitFor();
      await verify('수정한 댓글에는 「(수정됨)」이 붙는다', await 상세.수정표시.innerText(), expected.edited);
    });

    await test.step('답글이 달린 내 댓글에서 「삭제」를 누른다', async () => {
      await 상세.삭제버튼(params.parentComment).click();
      await 상세.삭제된댓글.waitFor();
      await verify(
        '답글이 달린 댓글을 삭제하면 댓글 자리에 「삭제된 댓글입니다」가 남고 답글은 그대로 보인다',
        [await 상세.삭제된댓글.innerText(), await 상세.댓글(params.reply).isVisible()].join(', '),
        expected.deleted,
      );
    });

    await test.step('답글이 없는 내 댓글에서 「삭제」를 누른다', async () => {
      await 상세.삭제버튼(params.editedComment).click();
      await 상세.댓글제목.filter({ hasText: '댓글 1' }).waitFor();
      await verify('답글이 없는 댓글을 삭제하면 댓글이 목록에서 사라진다', await 상세.댓글(params.editedComment).count(), 0);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
