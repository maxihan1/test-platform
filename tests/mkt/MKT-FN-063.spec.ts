import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

function 가입본문(아이디: string, 이름: string) {
  return {
    loginId: 아이디,
    password: 예시비밀번호,
    passwordConfirm: 예시비밀번호,
    name: 이름,
    email: `${아이디}@example.com`,
    phone: '',
    birth: '',
    gender: '선택 안 함',
    interests: [],
    terms: true,
    privacy: true,
    marketing: false,
  };
}

async function 탈퇴로치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
  if (로그인.ok()) await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-063',
  name: 'FAQ 는 로그인 없이 받고 문의와 알림 API 는 로그인한 회원에게 목록을 준다',
  precondition: [
    '비회원이다',
    '이번 실행에서 가입한 회원이 로그인해 있다',
    '이번 실행에서 가입한 회원의 글에 다른 회원이 댓글을 달았다',
  ],
  params: null,
  expected: z.object({
    faq: z.string().describe('FAQ 응답 코드와 목록 상태').default('200 목록 있음'),
    unauthorized: z.string().describe('비로그인 문의 응답 코드와 코드명').default('401 UNAUTHORIZED'),
    ready: z.string().describe('가입 둘과 로그인 둘의 응답 코드').default('201, 201, 200, 200'),
    created: z.string().describe('글과 댓글 응답 코드').default('201, 201'),
    found: z.boolean().describe('목록에 문의가 있는지').default(true),
    notified: z.boolean().describe('알림 한 건과 읽지 않은 수 하나가 있는지').default(true),
    unread: z.number().describe('읽음 처리 뒤 읽지 않은 수').default(0),
  }),
});

interface 알림응답 {
  items: unknown[];
  unread: number;
}

test(spec, async ({ page, request, expected }) => {
  const 글쓴이 = 새아이디();
  const 댓글쓴이 = 새아이디();
  const 브라우저 = page.context().browser();
  if (!브라우저) throw new Error('브라우저를 얻지 못했습니다');
  const 둘째문맥 = await 브라우저.newContext({ baseURL: process.env.PLATFORM_BASE_URL });
  const 제목 = `문의 ${글쓴이}`;
  let 글번호: number | undefined;

  try {
    await test.step('GET /api/faq 를 부른다', async () => {
      const 응답 = await request.get('/api/faq');
      const 본문 = (await 응답.json()) as { items?: unknown[] };
      await verify('GET /api/faq 는 로그인 없이 FAQ 목록을 준다', `${응답.status()} ${(본문.items?.length ?? 0) > 0 ? '목록 있음' : '목록 없음'}`, expected.faq);
    });

    await test.step('GET /api/inquiries 를 부른다', async () => {
      const 응답 = await request.get('/api/inquiries');
      const 본문 = (await 응답.json()) as { code?: string };
      await verify('로그인 없이 GET /api/inquiries 를 부르면 401 UNAUTHORIZED 가 온다', `${응답.status()} ${본문.code}`, expected.unauthorized);
    });

    await test.step('이번 실행에서 가입한 회원들이 로그인한다', async () => {
      const 응답들 = [
        await request.post('/api/auth/signup', { data: 가입본문(글쓴이, '글쓴이') }),
        await 둘째문맥.request.post('/api/auth/signup', { data: 가입본문(댓글쓴이, '댓글쓴이') }),
        await request.post('/api/auth/login', { data: { loginId: 글쓴이, password: 예시비밀번호, remember: false } }),
        await 둘째문맥.request.post('/api/auth/login', { data: { loginId: 댓글쓴이, password: 예시비밀번호, remember: false } }),
      ];
      await verify('이번 실행에서 가입한 회원이 로그인해 있다', 응답들.map((응답) => 응답.status()).join(', '), expected.ready, { blocker: true });
    });

    await test.step('POST /api/inquiries 로 문의를 보내고 GET /api/inquiries 를 부른다', async () => {
      await request.post('/api/inquiries', { data: { type: '주문', title: 제목, content: '문의 내용입니다', fileName: '', fileData: '', emailNotify: false } });
      const 응답 = await request.get('/api/inquiries');
      const 본문 = (await 응답.json()) as { items?: { title?: string }[] };
      await verify('POST /api/inquiries 로 문의를 등록하면 GET /api/inquiries 의 내 문의 목록에 그 문의가 있다', (본문.items ?? []).some((문의) => 문의.title === 제목), expected.found);
    });

    await test.step('다른 회원이 글에 댓글을 단다', async () => {
      const 글 = await request.post('/api/posts', { data: { category: '자유', title: `알림 확인 ${글쓴이}`, content: '알림 확인용 본문입니다', images: [] } });
      글번호 = ((await 글.json()) as { id?: number }).id;
      const 댓글 = await 둘째문맥.request.post(`/api/posts/${글번호}/comments`, { data: { content: '알림 확인용 댓글입니다', parentId: null } });
      await verify('이번 실행에서 가입한 회원의 글에 다른 회원이 댓글을 달았다', `${글.status()}, ${댓글.status()}`, expected.created, { blocker: true });
    });

    await test.step('GET /api/notifications 를 부른다', async () => {
      const 응답 = await request.get('/api/notifications');
      const 본문 = (await 응답.json()) as 알림응답;
      await verify('GET /api/notifications 는 알림 목록과 읽지 않은 수를 준다', 본문.items.length === 1 && 본문.unread === 1, expected.notified);
    });

    await test.step('POST /api/notifications/read 를 부른 뒤 GET /api/notifications 를 부른다', async () => {
      await request.post('/api/notifications/read');
      const 응답 = await request.get('/api/notifications');
      const 본문 = (await 응답.json()) as 알림응답;
      await verify('POST /api/notifications/read 를 부르면 읽지 않은 수가 0 이 된다', 본문.unread, expected.unread);
    });
  } finally {
    if (글번호 !== undefined) await request.delete(`/api/posts/${글번호}`);
    await 탈퇴로치운다(request, 글쓴이);
    await 탈퇴로치운다(둘째문맥.request, 댓글쓴이);
    await 둘째문맥.close();
  }
});
