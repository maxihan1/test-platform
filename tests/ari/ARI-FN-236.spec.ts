import { defineCase, test, verify } from '@platform/kit';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지목록읽기, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-236',
  name: '공지를 만든 뒤 GET /opsapi/notices 를 부르면 그 공지가 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('[QA] 공지를 만든 뒤 GET /opsapi/notices 를 부른다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-236'), body: '공지 목록 시험', enabled: false }, 만든번호들);
      await verify('공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
      const 목록 = await 공지목록읽기(admin);
      const 코드 = await verify('응답 코드가 200 이다', 목록.코드, 200);
      const 보임 = await verify('만든 공지가 목록에 있다', 목록.목록.some((n) => n.id === 만들기.몸.id), true);
      await verify('공지를 만든 뒤 GET /opsapi/notices 를 부르면 그 공지가 보인다', 코드 && 보임, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
