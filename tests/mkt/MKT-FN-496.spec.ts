import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-496',
  name: '노출 배너 조회는 노출이 켜진 배너만 순서대로 돌려준다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('노출 배너 /api/banners 를 부른다', async () => {
    await verify('비회원이다', (await request.get('/api/auth/me')).status(), 401, { blocker: true });
    const 응답 = await request.get('/api/banners');
    const 본문 = (await 응답.json()) as { items: { visible: boolean }[] };
    await verify('노출 배너 조회는 노출이 켜진 배너만 순서대로 돌려준다', [응답.status(), 본문.items.length > 0, 본문.items.every((배너) => 배너.visible)], [200, true, true]);
  });
});
