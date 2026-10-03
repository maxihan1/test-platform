import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-030',
  name: '세션 · 배너 · 설정 · 이벤트 띠 API 를 부르면 알맞은 응답이 온다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ request, params }) => {
  await test.step('로그인하기 전에 GET /api/session 을 부른다', async () => {
    const 응답 = await request.get('/api/session');
    await verify('비로그인으로 GET /api/session 을 부르면 200 과 {"user":null} 이 온다', [응답.status(), await 응답.json()], [200, { user: null }]);
  });

  await test.step('GET /api/banners 를 부른다', async () => {
    const 응답 = await request.get('/api/banners');
    const 배너들 = ((await 응답.json()) as { items: { visible: boolean }[] }).items;
    await verify('GET /api/banners 는 로그인 없이 노출 배너를 순서대로 준다', [응답.status(), 배너들.length > 0 && 배너들.every((배너) => 배너.visible)], [200, true]);
  });

  await test.step('GET /api/settings 를 부른다', async () => {
    const 응답 = await request.get('/api/settings');
    const 본문 = (await 응답.json()) as { noticePopup: unknown };
    await verify('GET /api/settings 는 로그인 없이 공지 팝업 켜짐 여부를 준다', [응답.status(), typeof 본문.noticePopup], [200, 'boolean']);
  });

  await test.step('GET /api/event-strip 을 부른다', async () => {
    const 응답 = await request.get('/api/event-strip');
    const 본문 = (await 응답.json()) as { message: string };
    await verify('GET /api/event-strip 은 로그인 없이 200 과 이벤트 띠 문구를 준다', [응답.status(), 본문.message], [200, '🎉 가을 맞이 전 상품 무료 배송']);
  });

  await test.step('로그인한 뒤 GET /api/session 을 부른다', async () => {
    await request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '', remember: false } });
    const 응답 = await request.get('/api/session');
    const 본문 = (await 응답.json()) as { user: { loginId: string } | null };
    await verify(
      '로그인한 뒤 GET /api/session 을 부르면 200 과 {"user":{...}} 로 현재 회원이 온다',
      [응답.status(), Object.keys(본문).join(','), 본문.user?.loginId],
      [200, 'user', params.loginId],
    );
  });
});
