import { defineCase, test, verify } from '@platform/kit';



export const spec = defineCase({
  tcId: 'MKU-FN-336',
  name: '주소 검색어가 1자면 400 으로 응답한다',
  techniques: ['경계값 분석'],
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
  });

  await test.step('GET /api/address?q=<1자> 를 부른다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: '가' } });
    await verify('주소 검색어가 1자면 400 으로 응답한다', 응답.status(), 400);
  });

  await test.step('GET /api/address?q=<2자> 를 부른다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: '강남' } });
    const 본문 = (await 응답.json()) as { items?: unknown[] };
    await verify('주소 검색어가 2자면 200 으로 주소 목록이 돌아온다', 응답.status() === 200 && Array.isArray(본문.items) && 본문.items.length > 0, true);
  });
});
