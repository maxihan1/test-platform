import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 공지삭제 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-351',
  name: '공지를 삭제한 뒤 하나 더 만들면 삭제한 번호보다 큰 번호가 매겨진다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('[QA] 공지를 만들고 삭제한 뒤 공지를 하나 더 만든다', async () => {
      const 첫째 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-351 첫째'), body: '번호 매기기 시험', enabled: false }, 만든번호들);
      await verify('첫 공지를 만들었다', 첫째.응답.status(), 200, { blocker: true });
      const 삭제 = await 공지삭제(admin, 첫째.몸.id ?? 0);
      await verify('첫 공지를 삭제했다', 삭제.status(), 204, { blocker: true });
      만든번호들.length = 0;
      const 둘째 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-351 둘째'), body: '번호 매기기 시험', enabled: false }, 만든번호들);
      await verify('둘째 공지를 만들었다', 둘째.응답.status(), 200, { blocker: true });
      await verify('공지를 삭제한 뒤 하나 더 만들면 삭제한 번호보다 큰 번호가 매겨진다', (둘째.몸.id ?? 0) > (첫째.몸.id ?? 0), true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
