import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-430',
  name: '노출 배너 요청은 배너를 순서대로 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/banners 를 부른다', async () => {
    const 응답 = await request.get('/api/banners');
    const 배너들 = ((await 응답.json()) as { items: { id: number; visible: boolean }[] }).items;
    await verify(
      '노출 배너 요청은 배너를 순서대로 준다',
      { 상태: 응답.status(), 배너있음: 배너들.length > 0, 노출만: 배너들.every((배너) => 배너.visible), 번호순: 배너들.every((배너, i) => i === 0 || (배너들[i - 1]?.id ?? 0) < 배너.id) },
      { 상태: 200, 배너있음: true, 노출만: true, 번호순: true },
    );
  });
});
