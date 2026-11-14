import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 시각 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 서버상태읽기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-154',
  name: '시작이 다른 공지 둘을 만들면 notices 에 시작이 늦은 것이 먼저 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('시작이 다른 [QA] 공지 둘을 만든 뒤 GET /api/serverstatus 를 부른다', async () => {
      const 늦은 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-154 늦은 시작'), body: '서버 상태 시험', enabled: true, startsAt: 시각(-5), endsAt: 시각(10) }, 만든번호들);
      await verify('시작이 늦은 공지를 만들었다', 늦은.응답.status(), 200, { blocker: true });
      const 이른 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-154 이른 시작'), body: '서버 상태 시험', enabled: true, startsAt: 시각(-20), endsAt: 시각(10) }, 만든번호들);
      await verify('시작이 이른 공지를 만들었다', 이른.응답.status(), 200, { blocker: true });
      const { 상태 } = await 서버상태읽기(request);
      const 번호순 = (상태?.notices ?? []).map((n) => n.id);
      const 늦은자리 = 번호순.indexOf(늦은.몸.id ?? 0);
      const 이른자리 = 번호순.indexOf(이른.몸.id ?? 0);
      await verify('만든 공지 둘이 notices 에 보인다', 늦은자리 >= 0 && 이른자리 >= 0, true, { blocker: true });
      await verify('시작이 다른 공지 둘을 만들면 notices 에 시작이 늦은 것이 먼저 보인다', 늦은자리 < 이른자리, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
