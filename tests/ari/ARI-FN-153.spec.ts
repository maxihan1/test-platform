import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 시각 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 서버상태읽기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-153',
  name: '켜져 있고 기간 안인 공지를 만들면 serverstatus 의 notices 에 그 공지가 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('켜져 있고 기간 안인 [QA] 공지를 만든 뒤 GET /api/serverstatus 를 부른다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-153'), body: '서버 상태 시험', enabled: true, startsAt: 시각(-1), endsAt: 시각(10) }, 만든번호들);
      await verify('공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
      const { 상태 } = await 서버상태읽기(request);
      await verify('켜져 있고 기간 안인 공지를 만들면 serverstatus 의 notices 에 그 공지가 보인다', (상태?.notices ?? []).some((n) => n.id === 만들기.몸.id), true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
