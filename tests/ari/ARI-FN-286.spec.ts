import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제목글 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-286',
  name: 'GET /Home/Error 를 부르면 200 으로 오류 안내 화면이 열린다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /Home/Error 를 부른다', async () => {
    const 화면 = await 화면글(request, '/Home/Error');
    const 코드 = await verify('GET /Home/Error 응답 코드가 기대 결과와 같다', 화면.status, expected.응답코드);
    const 제목 = await verify('탭 제목에 「Error」가 들어 있다', 제목글(화면.html).includes('Error'), true);
    await verify('GET /Home/Error 를 부르면 200 으로 오류 안내 화면이 열린다', 코드 && 제목, true);
  });
});
