import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 시각 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-513',
  name: 'endsAt 을 startsAt 보다 앞으로 공지를 만들면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('endsAt 을 startsAt 보다 앞으로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-513'), body: '기간 순서 시험', startsAt: 시각(120), endsAt: 시각(60), enabled: false }, 만든번호들);
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 만들기.응답.status(), expected.응답코드);
      const 종류 = await verify('응답 code 가 INVALID 다', 만들기.몸.code ?? '', 'INVALID');
      await verify('endsAt 을 startsAt 보다 앞으로 공지를 만들면 400 INVALID 다', 코드 && 종류, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
