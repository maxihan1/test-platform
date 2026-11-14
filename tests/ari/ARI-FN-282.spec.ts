import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로 } from './helpers/html.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-282',
  name: '쿠키 없이 GET /Account/Dashboard 를 부르면 302 로 /Home?ReturnUrl=/Account/Dashboard 로 이동한다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('쿠키 없이 GET /Account/Dashboard 를 부른다', async () => {
    const 응답 = await request.get('/Account/Dashboard', { maxRedirects: 0 });
    const 코드 = await verify('GET /Account/Dashboard 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Home?ReturnUrl=/Account/Dashboard」다', 이동경로(응답), '/Home?ReturnUrl=/Account/Dashboard');
    await verify('쿠키 없이 GET /Account/Dashboard 를 부르면 302 로 /Home?ReturnUrl=/Account/Dashboard 로 이동한다', 코드 && 주소, true);
  });
  await test.step('쿠키 없이 GET /Account/Edit 를 부른다', async () => {
    const 응답 = await request.get('/Account/Edit', { maxRedirects: 0 });
    const 코드 = await verify('GET /Account/Edit 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Home?ReturnUrl=/Account/Edit」다', 이동경로(응답), '/Home?ReturnUrl=/Account/Edit');
    await verify('쿠키 없이 부른 GET /Account/Edit 는 302 로 /Home?ReturnUrl=/Account/Edit 로 이동한다', 코드 && 주소, true);
  });
  await test.step('쿠키 없이 GET /Account/ChangePassword 를 부른다', async () => {
    const 응답 = await request.get('/Account/ChangePassword', { maxRedirects: 0 });
    const 코드 = await verify('GET /Account/ChangePassword 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Home?ReturnUrl=/Account/ChangePassword」다', 이동경로(응답), '/Home?ReturnUrl=/Account/ChangePassword');
    await verify('쿠키 없이 부른 GET /Account/ChangePassword 는 302 로 /Home?ReturnUrl=/Account/ChangePassword 로 이동한다', 코드 && 주소, true);
  });
  await test.step('쿠키 없이 GET /Account/Delete 를 부른다', async () => {
    const 응답 = await request.get('/Account/Delete', { maxRedirects: 0 });
    const 코드 = await verify('GET /Account/Delete 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Home?ReturnUrl=/Account/Delete」다', 이동경로(응답), '/Home?ReturnUrl=/Account/Delete');
    await verify('쿠키 없이 부른 GET /Account/Delete 는 302 로 /Home?ReturnUrl=/Account/Delete 로 이동한다', 코드 && 주소, true);
  });
});
