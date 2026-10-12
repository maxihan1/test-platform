import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-348',
  name: '회원이 PUT /api/admin/banners 를 보내면 403 으로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보: 회원정보 | undefined;

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('PUT /api/admin/banners 를 보낸다', async () => {
      const 현재 = (await (await request.get('/api/banners')).json()) as { items: { id: number; visible: boolean }[] };
      const 응답 = await request.put('/api/admin/banners', { data: { items: 현재.items.map((배너) => ({ id: 배너.id, visible: 배너.visible })) } });
      await verify('회원이 PUT /api/admin/banners 를 보내면 403 으로 응답한다', 응답.status(), 403);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(request);
  }
});
