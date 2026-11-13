import { defineCase, test, verify } from '@platform/kit';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-247',
  name: 'enabled 없이 공지를 만들면 enabled 가 거짓이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('enabled 없이 [QA] 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-247'), body: '켜짐 기본값 시험' }, 만든번호들);
      await verify('공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
      await verify('enabled 없이 공지를 만들면 enabled 가 거짓이다', 만들기.몸.enabled, false);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
