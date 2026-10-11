import { defineCase, test, verify } from '@platform/kit';



export const spec = defineCase({
  tcId: 'MKT-FN-333',
  name: 'GET /api/settings 는 noticePopup 참거짓 값을 돌려준다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
  });

  await test.step('GET /api/settings 를 부른다', async () => {
    const 본문 = (await (await request.get('/api/settings')).json()) as { noticePopup?: unknown };
    await verify('GET /api/settings 는 noticePopup 참거짓 값을 돌려준다', typeof 본문.noticePopup === 'boolean', true);
  });
});
