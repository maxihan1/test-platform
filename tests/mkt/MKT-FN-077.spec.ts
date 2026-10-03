import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
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
  tcId: 'MKT-FN-077',
  name: '글쓰기 내용을 임시 저장하면 다시 들어올 때 불러올 수 있고 등록하면 임시 저장본이 지워진다',
  platforms: ['desktop'],
  precondition: ['일반 회원이 로그인해 있다', '글쓰기 화면에 제목과 본문을 적었다', '임시 저장한 글이 있다'],
  params: z.object({
    category: z.string().min(1).describe('글 분류').default('자유'),
    title: z.string().min(1).describe('글 제목').default('임시 저장 시험용 글입니다'),
    content: z.string().min(1).describe('글 본문').default('임시 저장 시험용 본문입니다. 열 글자를 넘깁니다.'),
  }),
  expected: z.object({
    saved: z.string().describe('저장된 제목과 본문').default('임시 저장 시험용 글입니다|임시 저장 시험용 본문입니다. 열 글자를 넘깁니다.'),
    confirmMessage: z.string().describe('불러오기 확인 창 문구').default('임시 저장된 글이 있습니다. 불러올까요?'),
    filled: z.string().describe('채워진 분류 · 제목 · 본문').default('true, true, true'),
    cleared: z.string().describe('다시 열 때 뜬 확인 창 수와 저장본이 비었는지').default('0, true'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);
  const 상세 = new 게시글상세(page);
  const 알림 = new 토스트(page);
  const 아이디 = await 가입한다(request);
  const 저장본 = (): Promise<string | null> => page.evaluate(() => localStorage.getItem('dm_draft'));
  const 확인창문구: string[] = [];

  try {
    await test.step('이번 실행에서 쓸 회원을 로그인시킨다', async () => {
      await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
      await 로그인.로그인한다(아이디, 새회원비밀번호);
    });

    await test.step('로그인 상태를 확인한다', async () => {
      await 머리.로그아웃.waitFor();
      await verify('일반 회원이 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('글쓰기 화면에 제목과 본문을 적는다', async () => {
      await 쓰기.열기();
      await 쓰기.채운다(params.category, params.title, params.content);
    });

    await test.step('「임시 저장」을 누르고 글쓰기 화면을 다시 연다', async () => {
      await 쓰기.임시저장.click();
      await 알림.문구('임시 저장되었습니다').waitFor();
      const 글 = JSON.parse((await 저장본()) ?? '{}') as { title?: string; content?: string };
      await verify('「임시 저장」을 누르면 지금 쓴 내용이 이 브라우저에 저장된다', `${글.title}|${글.content}`, expected.saved);
    });

    await test.step('글쓰기 화면을 다시 연다', async () => {
      page.on('dialog', async (대화) => {
        if (대화.type() === 'confirm') 확인창문구.push(대화.message());
        await 대화.accept();
      });
      await page.goto('/board/write', { waitUntil: 'commit' });
      await 쓰기.제목글자수.filter({ hasText: `${params.title.length}/50` }).waitFor();
      await verify('임시 저장한 뒤 글쓰기에 들어오면 확인 창 「임시 저장된 글이 있습니다. 불러올까요?」가 뜬다', 확인창문구.join(' / '), expected.confirmMessage);
    });

    await test.step('확인 창에서 「확인」을 누른다', async () => {
      await 쓰기.제목글자수.filter({ hasText: `${params.title.length}/50` }).waitFor();
      await verify(
        '확인 창에서 「확인」을 누르면 임시 저장한 내용이 채워진다',
        [(await 쓰기.분류선택.innerText()) === params.category, (await 쓰기.제목칸.inputValue()) === params.title, (await 쓰기.본문칸.inputValue()) === params.content].join(', '),
        expected.filled,
      );
    });

    await test.step('불러온 글을 등록하고 글쓰기 화면을 다시 연다', async () => {
      await 쓰기.등록.click();
      await 상세.제목.waitFor();
      const 이전 = 확인창문구.length;
      await 쓰기.열기();
      await verify('글을 등록하면 임시 저장본이 지워진다', [확인창문구.length - 이전, (await 저장본()) === null].join(', '), expected.cleared);
    });
  } finally {
    await 치운다(request, 아이디);
  }
});
