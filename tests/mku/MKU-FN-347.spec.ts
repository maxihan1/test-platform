import { defineCase, test, verify } from '@platform/kit';



export const spec = defineCase({
  tcId: 'MKU-FN-347',
  name: '로그인 없이 GET /api/banners 를 부르면 노출 배너가 돌아온다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
  });

  await test.step('GET /api/banners 를 부른다', async () => {
    const 응답 = await request.get('/api/banners');
    const 본문 = (await 응답.json()) as { items?: { visible: boolean }[] };
    await verify('로그인 없이 GET /api/banners 를 부르면 노출 배너가 돌아온다', 응답.status() === 200 && (본문.items?.length ?? 0) > 0 && (본문.items ?? []).every((배너) => 배너.visible), true);
  });
});
