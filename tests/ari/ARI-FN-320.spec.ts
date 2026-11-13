import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원로그인, 화면글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-320',
  name: '캐릭터가 없는 계정으로 대시보드를 열면 「No characters found.」가 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('캐릭터가 없는 일회용 회원으로 웹 로그인한 뒤 GET /Account/Dashboard 를 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 화면 = await 화면글(request, '/Account/Dashboard');
    await verify('대시보드 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    await verify('캐릭터가 없는 계정으로 대시보드를 열면 「No characters found.」가 보인다', 화면글들(화면.html).includes('No characters found.'), true);
  });
});
