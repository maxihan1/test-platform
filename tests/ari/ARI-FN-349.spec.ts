import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로, 일회용회원로그인 } from './helpers/html.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-349',
  name: '로그인한 채 GET /Account/Logout 을 부르면 홈으로 이동하고 그 뒤 대시보드는 로그인 화면으로 보낸다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('일회용 회원으로 웹 로그인한 채 GET /Account/Logout 을 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 로그아웃 = await request.get('/Account/Logout', { maxRedirects: 0 });
    const 로그아웃코드 = await verify('로그아웃 응답 코드가 기대 결과와 같다', 로그아웃.status(), expected.응답코드);
    const 홈 = await verify('로그아웃 이동 주소가 홈 「/」다', 이동경로(로그아웃), '/');
    const 대시보드 = await request.get('/Account/Dashboard', { maxRedirects: 0 });
    const 대시보드코드 = await verify('로그아웃 뒤 대시보드 응답 코드가 기대 결과와 같다', 대시보드.status(), expected.응답코드);
    const 로그인화면 = await verify('대시보드 이동 경로가 로그인 화면 「/Home」이다', 이동경로(대시보드).split('?')[0], '/Home');
    await verify('로그인한 채 GET /Account/Logout 을 부르면 홈으로 이동하고 그 뒤 대시보드는 로그인 화면으로 보낸다', 로그아웃코드 && 홈 && 대시보드코드 && 로그인화면, true);
  });
});
