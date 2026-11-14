import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 공지삭제, 본문글 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-252',
  name: '만든 공지를 삭제하면 204 이고 본문이 없다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(204),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 만든번호들: number[] = [];
  let 공지번호 = 0;
  try {
    await test.step('삭제할 [QA] 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-252'), body: '공지 삭제 시험', enabled: false }, 만든번호들);
      공지번호 = 만들기.몸.id ?? 0;
      await verify('삭제할 공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
    });
    await test.step('만든 [QA] 공지를 DELETE /opsapi/notices/{id} 로 삭제한다', async () => {
      const 응답 = await 공지삭제(admin, 공지번호);
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 본문 = await verify('응답 본문이 비어 있다', await 본문글(응답), '');
      await verify('만든 공지를 삭제하면 204 이고 본문이 없다', 코드 && 본문, true);
      if (코드) 만든번호들.length = 0;
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
