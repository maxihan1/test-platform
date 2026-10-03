import { defineCase, test, verify } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-003',
  name: '내 글에 댓글이 달리면 알림 종에 알림이 쌓이고 내가 단 댓글은 쌓이지 않는다',
  platforms: ['desktop'],
  precondition: ['회원 두 명이 로그인할 수 있다', '첫째 회원의 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${(Math.random().toString(36) + '000').slice(2, 5)}`;
}

async function 가입한다(request: APIRequestContext, 아이디: string): Promise<number> {
  const 응답 = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 예시비밀번호,
      passwordConfirm: 예시비밀번호,
      name: '마켓검사',
      email: `${아이디}@demo.market`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  return 응답.status();
}

async function 안읽은수(request: APIRequestContext): Promise<number> {
  const 응답 = await request.get('/api/notifications');
  return ((await 응답.json()) as { unread: number }).unread;
}

async function 댓글을단다(request: APIRequestContext, 글번호: number): Promise<number> {
  const 응답 = await request.post(`/api/posts/${글번호}/comments`, { data: { content: '알림 검사용 댓글입니다', parentId: null } });
  return ((await 응답.json()) as { id: number }).id;
}

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 글쓴이 = 새아이디();
  const 댓글쓴이 = 새아이디();
  const 댓글쓴이의댓글: number[] = [];
  const 글쓴이의댓글: number[] = [];
  let 글번호 = 0;

  try {
    await test.step('글쓴이와 댓글 쓴이 회원을 만들고 글쓴이가 새 글을 쓴다', async () => {
      await 홈.쿠키띠를치운다();
      await 홈.공지팝업을치운다();
      await 홈.설문을치운다();
      const 가입들 = [await 가입한다(request, 글쓴이), await 가입한다(request, 댓글쓴이)];
      const 댓글쓴이로그인 = await request.post('/api/auth/login', { data: { loginId: 댓글쓴이, password: 예시비밀번호, remember: false } });
      await verify('회원 두 명이 가입하고 댓글 쓴이가 로그인한다', [...가입들, 댓글쓴이로그인.status()], [201, 201, 200], { blocker: true });
      await 로그인.로그인한다(글쓴이, 예시비밀번호);
      const 글 = await page.request.post('/api/posts', {
        data: { category: '자유', title: `알림 검사 글 ${글쓴이}`, content: '알림 검사용 글입니다', images: [] },
      });
      await verify('글쓴이의 새 글이 만들어진다', 글.status(), 201, { blocker: true });
      글번호 = ((await 글.json()) as { id: number }).id;
    });

    await test.step('둘째 회원이 첫째 회원의 글에 댓글을 단다', async () => {
      const 전 = await 안읽은수(page.request);
      댓글쓴이의댓글.push(await 댓글을단다(request, 글번호));
      const 후 = await 안읽은수(page.request);
      await verify('남의 글에 댓글을 달면 글쓴이의 알림 수가 늘어난다', 후 > 전, true);
    });

    await test.step('둘째 회원이 첫째 회원의 글에 댓글을 달고 첫째 회원 화면에서 알림 종 옆을 확인한다', async () => {
      댓글쓴이의댓글.push(await 댓글을단다(request, 글번호));
      await 홈.열고알림응답을기다린다();
      await 머리.알림종.waitFor();
      const 보임 = await 머리.알림배지.waitFor({ state: 'visible', timeout: 5000 }).then(
        () => true,
        () => false,
      );
      await verify('내 글에 새 댓글이 달리면 알림 종 옆에 읽지 않은 알림 수가 보인다', 보임, true);
    });

    await test.step('첫째 회원이 알림 종을 누른다', async () => {
      await 머리.알림종.click();
      await 머리.알림목록.waitFor();
      const 숨김 = await 머리.알림배지.waitFor({ state: 'hidden', timeout: 5000 }).then(
        () => true,
        () => false,
      );
      await verify('알림 종을 누르면 알림 목록이 펼쳐지고 읽지 않은 알림 수가 보이지 않는다', [await 머리.알림목록.isVisible(), 숨김], [true, true]);
    });

    await test.step('첫째 회원이 자기 글에 직접 댓글을 단다', async () => {
      const 전 = await 안읽은수(page.request);
      글쓴이의댓글.push(await 댓글을단다(page.request, 글번호));
      const 후 = await 안읽은수(page.request);
      await verify('내 글에 내가 단 댓글은 내 알림 수를 늘리지 않는다', 후, 전);
    });
  } finally {
    for (const 번호 of 댓글쓴이의댓글) await request.delete(`/api/comments/${번호}`);
    for (const 번호 of 글쓴이의댓글) await page.request.delete(`/api/comments/${번호}`);
    if (글번호 !== 0) await page.request.delete(`/api/posts/${글번호}`);
    await request.delete('/api/me');
    await page.request.delete('/api/me');
  }
});
