import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기 } from './helpers/api.helper.js';
import { 이동경로, 일회용회원로그인 } from './helpers/html.helper.js';
import { 숨은계정번호, 위조방지토큰, 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-345',
  name: '로그인한 채 POST /Account/Delete 를 보내면 계정이 남은 채 홈으로 이동한다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  await test.step('일회용 회원으로 웹 로그인한 채 POST /Account/Delete 를 보낸다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 폼 = await 화면글(request, '/Account/Edit');
    const 응답 = await request.post('/Account/Delete', {
      form: { Id: String(숨은계정번호(폼.html)), __RequestVerificationToken: 위조방지토큰(폼.html) },
      maxRedirects: 0,
    });
    const 코드 = await verify('삭제 요청 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 홈 「/」다', 이동경로(응답), '/');
    const 남음 = await verify('일회용 회원 계정이 남아 있다', (await 계정번호찾기(admin, 회원.아이디)) > 0, true);
    await verify('로그인한 채 POST /Account/Delete 를 보내면 계정이 남은 채 홈으로 이동한다', 코드 && 주소 && 남음, true);
  });
});
