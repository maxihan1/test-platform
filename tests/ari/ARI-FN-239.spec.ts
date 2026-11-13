import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 남은QA공지삭제 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지목록읽기, 공지번호들삭제, 공지여럿만들기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-239',
  name: '공지가 200건이 되게 만든 뒤 GET /opsapi/notices 를 부르면 200건이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    돌아온건수: z.number().describe('목록으로 돌아오는 공지 건수').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, expected }) => {
  const 한도 = 200;
  const 만든번호들: number[] = [];
  try {
    await test.step('공지가 200건이 되게 꺼진 [QA] 공지를 만든 뒤 GET /opsapi/notices 를 부른다', async () => {
      await 남은QA공지삭제(admin, '[QA] ARI-FN-239');
      const 처음 = await 공지목록읽기(admin);
      await verify('공지 목록을 읽었다', 처음.코드, 200, { blocker: true });
      const 모자람 = Math.max(0, 한도 - 처음.목록.length);
      const 만든수 = await 공지여럿만들기(admin, 모자람, 'ARI-FN-239 채움', 만든번호들);
      await verify('모자란 만큼 공지를 만들었다', 만든수, 모자람, { blocker: true });
      const 목록 = await 공지목록읽기(admin);
      await verify('공지가 200건이 되게 만든 뒤 GET /opsapi/notices 를 부르면 200건이 돌아온다', 목록.목록.length, expected.돌아온건수);
    });
    await test.step('꺼진 [QA] 공지를 1건 더 만든 뒤 GET /opsapi/notices 를 부른다', async () => {
      const 한건 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-239 한 건 더'), body: '공지 건수 시험', enabled: false }, 만든번호들);
      await verify('공지 한 건을 더 만들었다', 한건.응답.status(), 200, { blocker: true });
      const 목록 = await 공지목록읽기(admin);
      await verify('공지가 201건일 때도 GET /opsapi/notices 는 200건까지만 돌아온다', 목록.목록.length, expected.돌아온건수);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
