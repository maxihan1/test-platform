import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

type 회원본문 = { loginId: string };
type 오류본문 = { code: string };

export const spec = defineCase({
  tcId: 'MKT-FN-092',
  name: '로그인 · 현재 회원 · 세션 · 로그아웃 API 는 로그인 여부와 계정 상태에 맞는 코드로 응답한다',
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('잠긴 회원 아이디').default('locked'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });

  try {
    await test.step('맞는 아이디와 비밀번호로 로그인 API 를 부른다', async () => {
      const 응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
      await verify('로그인 API 는 맞는 아이디와 비밀번호에 200 으로 응답한다', 응답.status(), 200, { blocker: true });
    });

    await test.step('틀린 비밀번호로 로그인 API 를 부른다 · 잠긴 회원으로 로그인 API 를 부른다', async () => {
      const 틀림 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: `${비밀번호}x` } });
      await verify('비밀번호가 틀리면 401 로 응답한다', 틀림.status(), 401);
      const 잠김 = await request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });
      await verify('잠긴 계정이면 423 과 코드 「LOCKED」로 응답한다', [잠김.status(), ((await 잠김.json()) as 오류본문).code], [423, 'LOCKED']);
    });

    await test.step('「GET /api/auth/me」를 부른다', async () => {
      const 로그인뒤 = await page.request.get('/api/auth/me');
      await verify('현재 회원 API 는 200 으로 현재 회원을 돌려준다', [로그인뒤.status(), ((await 로그인뒤.json()) as 회원본문).loginId], [200, 아이디]);
      const 로그인전 = await request.get('/api/auth/me');
      await verify('비로그인이면 현재 회원 API 가 401 로 응답한다', 로그인전.status(), 401);
    });

    await test.step('「GET /api/session」을 부른다', async () => {
      const 로그인뒤 = await page.request.get('/api/session');
      await verify('로그인 상태면 세션 API 가 user 에 회원을 담아 응답한다', ((await 로그인뒤.json()) as { user: 회원본문 | null }).user?.loginId, 아이디);
      const 로그인전 = await request.get('/api/session');
      await verify(
        '비로그인이면 세션 API 는 401 이 아니라 200 으로 user 가 null 인 응답을 준다',
        [로그인전.status(), ((await 로그인전.json()) as { user: 회원본문 | null }).user],
        [200, null],
      );
    });

    await test.step('로그아웃 API 를 부른다', async () => {
      const 응답 = await page.request.post('/api/auth/logout');
      await verify('로그아웃 API 는 204 로 응답한다', 응답.status(), 204);
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
    await page.request.delete('/api/me');
  }
});
