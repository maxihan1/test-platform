import { defineCase, test, verify } from '@platform/kit';

import { 서버상태읽기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-155',
  name: 'GET /api/serverstatus 를 부르면 serverTime 이 Z 로 끝나는 UTC 시각이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('인증 없이 GET /api/serverstatus 를 불러 serverTime 을 읽는다', async () => {
    const { 코드, 상태 } = await 서버상태읽기(request);
    await verify('응답 코드가 200 이다', 코드, 200, { blocker: true });
    const 날짜 = await verify('serverTime 이 날짜로 읽힌다', Number.isNaN(Date.parse(상태?.serverTime ?? '')), false);
    const 끝 = await verify('serverTime 끝이 Z 다', (상태?.serverTime ?? '').endsWith('Z'), true);
    await verify('GET /api/serverstatus 를 부르면 serverTime 이 Z 로 끝나는 UTC 시각이다', 날짜 && 끝, true);
  });
});
