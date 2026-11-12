import { defineCase, test, verify } from '@platform/kit';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-543',
  name: 'offset=1 로 디렉터리를 부르면 첫 계정이 offset 없이 받은 둘째 계정과 같다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/v1/directory?limit=2 와 ?offset=1&limit=1 을 부른다', async () => {
    const 처음 = await 응답번호들(request, '/api/v1/directory?limit=2');
    const 건너뜀 = await 응답번호들(request, '/api/v1/directory?offset=1&limit=1');
    await verify('offset=1 로 디렉터리를 부르면 첫 계정이 offset 없이 받은 둘째 계정과 같다', 건너뜀[0] ?? '', 처음[1] ?? '');
  });
});
