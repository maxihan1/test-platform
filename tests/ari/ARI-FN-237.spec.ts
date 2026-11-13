import { defineCase, test, verify } from '@platform/kit';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지목록읽기, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-237',
  name: '공지 둘을 차례로 만들면 GET /opsapi/notices 에 번호가 큰 것이 먼저 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('[QA] 공지 둘을 차례로 만든 뒤 GET /opsapi/notices 를 부른다', async () => {
      const 먼저 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-237 먼저'), body: '공지 목록 시험', enabled: false }, 만든번호들);
      await verify('먼저 만든 공지가 만들어졌다', 먼저.응답.status(), 200, { blocker: true });
      const 나중 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-237 나중'), body: '공지 목록 시험', enabled: false }, 만든번호들);
      await verify('나중에 만든 공지가 만들어졌다', 나중.응답.status(), 200, { blocker: true });
      const 목록 = await 공지목록읽기(admin);
      const 번호순 = 목록.목록.map((n) => n.id);
      const 먼저자리 = 번호순.indexOf(먼저.몸.id ?? 0);
      const 나중자리 = 번호순.indexOf(나중.몸.id ?? 0);
      await verify('만든 공지 둘이 목록에 있다', 먼저자리 >= 0 && 나중자리 >= 0, true, { blocker: true });
      await verify('나중에 만든 공지의 번호가 먼저 만든 것보다 크다', (나중.몸.id ?? 0) > (먼저.몸.id ?? 0), true);
      await verify('공지 둘을 차례로 만들면 GET /opsapi/notices 에 번호가 큰 것이 먼저 보인다', 나중자리 < 먼저자리, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
