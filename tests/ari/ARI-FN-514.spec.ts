import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 공지수정 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-514',
  name: '제목을 비워 공지를 수정하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 만든번호들: number[] = [];
  let 공지번호 = 0;
  try {
    await test.step('수정할 [QA] 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-514'), body: '공지 수정 시험', enabled: false }, 만든번호들);
      공지번호 = 만들기.몸.id ?? 0;
      await verify('수정할 공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
    });
    await test.step('제목을 비워 PUT /opsapi/notices/{id} 로 수정한다', async () => {
      const 응답 = await 공지수정(admin, 공지번호, { title: '', body: '공지 수정 시험', enabled: false });
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 종류 = await verify('응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      await verify('제목을 비워 공지를 수정하면 400 INVALID 다', 코드 && 종류, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
