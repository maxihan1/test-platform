import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-499',
  name: '설정 조회는 공지 팝업 켜짐 여부 「noticePopup」을 돌려준다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('설정 조회 /api/settings 를 부른다', async () => {
    await verify('비회원이다', (await request.get('/api/auth/me')).status(), 401, { blocker: true });
    const 응답 = await request.get('/api/settings');
    const 본문 = (await 응답.json()) as { noticePopup?: unknown };
    await verify('설정 조회는 공지 팝업 켜짐 여부 「noticePopup」을 돌려준다', [응답.status(), typeof 본문.noticePopup], [200, 'boolean']);
  });
});
