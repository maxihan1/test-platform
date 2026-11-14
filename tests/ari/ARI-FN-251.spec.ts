import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 공지삭제 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 공지수정 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-251',
  name: '없는 공지 번호를 수정하면 404 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  const 만든번호들: number[] = [];
  let 없는번호 = 0;
  try {
    await test.step('없는 공지 번호를 마련한다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-251'), body: '없는 번호 시험', enabled: false }, 만든번호들);
      await verify('공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
      없는번호 = 만들기.몸.id ?? 0;
      const 삭제 = await 공지삭제(admin, 없는번호);
      await verify('만든 공지를 지웠다', 삭제.status(), 204, { blocker: true });
      만든번호들.length = 0;
    });
    await test.step('없는 공지 번호를 PUT /opsapi/notices/{id} 로 수정한다', async () => {
      const 응답 = await 공지수정(admin, 없는번호, { title: 고유이름('ARI-FN-251 수정'), body: '없는 번호 시험', enabled: false });
      await verify('없는 공지 번호를 수정하면 404 다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
