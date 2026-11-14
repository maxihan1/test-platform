import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 시각 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 서버상태읽기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-500',
  name: '꺼진 공지를 만들면 serverstatus 의 notices 에 그 공지가 보이지 않는다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('꺼진 [QA] 공지를 만든 뒤 GET /api/serverstatus 를 부른다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-500 꺼짐'), body: '서버 상태 시험', enabled: false, startsAt: 시각(-1), endsAt: 시각(10) }, 만든번호들);
      await verify('공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
      const { 상태 } = await 서버상태읽기(request);
      await verify('꺼진 공지를 만들면 serverstatus 의 notices 에 그 공지가 보이지 않는다', (상태?.notices ?? []).some((n) => n.id === 만들기.몸.id), false);
    });
    await test.step('기간이 지난 [QA] 공지를 만든 뒤 GET /api/serverstatus 를 부른다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-500 지남'), body: '서버 상태 시험', enabled: true, startsAt: 시각(-20), endsAt: 시각(-10) }, 만든번호들);
      await verify('공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
      const { 상태 } = await 서버상태읽기(request);
      await verify('기간이 지난 공지일 때도 serverstatus 의 notices 에 보이지 않는다', (상태?.notices ?? []).some((n) => n.id === 만들기.몸.id), false);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
