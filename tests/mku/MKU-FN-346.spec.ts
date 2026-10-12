import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-346',
  name: '회원이 GET /api/admin/users 를 부르면 403 으로 응답한다',
  techniques: ['동등 분할', '상태 전이'],
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

    await test.step('GET /api/admin/users 를 부른다', async () => {
      const 응답 = await request.get('/api/admin/users');
      await verify('회원이 GET /api/admin/users 를 부르면 403 으로 응답한다', 응답.status(), 403);
    });

    await test.step('POST /api/admin/users/{id}/unlock 을 부른다', async () => {
      const 응답 = await request.post('/api/admin/users/' + String((await 내정보(request)).id) + '/unlock');
      await verify('회원이 잠금 해제 POST /api/admin/users/{id}/unlock 을 부르면 403 으로 응답한다', 응답.status(), 403);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(request);
  }
});
