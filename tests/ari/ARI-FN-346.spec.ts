import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내용칸글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-346',
  name: '로그인 없이 GET /Account/Details/1 을 부르면 200 으로 내용 없는 화면이 열린다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('로그인 없이 GET /Account/Details/1 을 부른다', async () => {
    const 화면 = await 화면글(request, '/Account/Details/1');
    const 코드 = await verify('GET /Account/Details/1 응답 코드가 기대 결과와 같다', 화면.status, expected.응답코드);
    const 내용 = await verify('화면의 내용 칸이 모두 비어 있다', 내용칸글들(화면.html).join(''), '');
    await verify('로그인 없이 GET /Account/Details/1 을 부르면 200 으로 내용 없는 화면이 열린다', 코드 && 내용, true);
  });
});
