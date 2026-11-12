import { defineCase, test, verify } from '@platform/kit';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-541',
  name: 'min_id 로 limit=1 을 부르면 min_id 바로 다음 글이 온다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '공개 타임라인에 글이 3개 이상 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 목록 = await 응답번호들(request, '/api/v1/timelines/public');
  await test.step('공개 타임라인 글 번호를 확인한다', async () => {
    await verify('공개 타임라인에 글이 3개 이상 있다', 목록.length >= 3, true, { blocker: true });
  });
  await test.step('공개 타임라인 셋째 글 번호를 min_id 로 limit=1 로 다시 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/timelines/public?min_id=${목록[2] ?? ''}&limit=1`);
    await verify('min_id 로 limit=1 을 부르면 min_id 바로 다음 글이 온다', 번호들[0] ?? '', 목록[1] ?? '');
  });
});
