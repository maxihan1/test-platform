import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';
import { 게시판목록 } from './pages/board-list.page.js';

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
  tcId: 'MKT-FN-072',
  name: '글 상세에서 「삭제」를 누르면 확인 모달이 뜨고 모달에서 삭제하면 목록에서 토스트가 보인다',
  platforms: ['desktop'],
  precondition: ['회원이 이번 실행에서 쓴 글의 상세 화면이다', '회원이 이번 실행에서 쓴 글의 상세 화면에 삭제 모달이 떠 있다'],
  params: z.object({
    title: z.string().min(1).describe('글 제목').default('삭제 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('삭제 시험용 본문입니다. 열 글자를 넘깁니다.'),
  }),
  expected: z.object({
    message: z.string().describe('삭제 모달 문구').default('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.'),
    result: z.string().describe('삭제 뒤 목록 경로와 토스트와 조회 응답 코드').default('/board, 삭제되었습니다, 404'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);
  const 목록 = new 게시판목록(page);
  const 대화상자 = new 모달(page);
  const 알림 = new 토스트(page);
  const 아이디 = await 가입한다(request);
  let 글번호 = 0;

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시키고 글을 써서 상세 화면을 연다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
      const res = await page.request.post('/api/posts', { data: { category: '자유', title: params.title, content: params.content, images: [] } });
      글번호 = ((await res.json()) as { id: number }).id;
      await 상세.열기(글번호);
    });

    await test.step('쓴 글의 상세 화면을 확인한다', async () => {
      await 상세.삭제.waitFor();
      await verify(
        '회원이 이번 실행에서 쓴 글의 상세 화면이다',
        [await 머리.로그아웃.isVisible(), await 상세.삭제.isVisible(), await 상세.제목.innerText()].join(', '),
        `true, true, ${params.title}`,
        { blocker: true },
      );
    });

    await test.step('「삭제」를 누른다', async () => {
      await 상세.삭제.click();
      await 상세.삭제모달문구.waitFor();
      await verify('「삭제」를 누르면 모달 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 뜬다', await 상세.삭제모달문구.innerText(), expected.message);
    });

    await test.step('모달에서 「삭제」를 누른다', async () => {
      await 대화상자.바닥버튼('게시글 삭제', '삭제').click();
      await 목록.줄이뜰때까지();
      const 조회 = await page.request.get(`/api/posts/${글번호}`);
      await verify(
        '모달에서 「삭제」를 누르면 글이 지워지고 목록으로 가서 토스트 「삭제되었습니다」가 보인다',
        [new URL(page.url()).pathname, await 알림.문구('삭제되었습니다').innerText(), 조회.status()].join(', '),
        expected.result,
      );
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
