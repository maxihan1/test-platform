import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 공지만들기, 공지삭제, 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-278',
  name: '운영자 API 에 깨진 JSON 을 보내면 400 이고 본문이 application/problem+json 형식이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('깨진 JSON 으로 POST /opsapi/notices 를 부른다', async () => {
    const 응답 = await admin.post('/opsapi/notices', { headers: { 'Content-Type': 'application/json' }, data: '{"title": "[QA] 깨진 JSON", "body": ' });
    try {
      const 코드 = await verify('깨진 JSON 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 형식 = await verify('깨진 JSON 응답 Content-Type 이 application/problem+json 이다', (응답.headers()['content-type'] ?? '').includes('application/problem+json'), true);
      await verify('운영자 API 에 깨진 JSON 을 보내면 400 이고 본문이 application/problem+json 형식이다', 코드 && 형식, true);
    } finally {
      if (응답.ok()) await 공지삭제(admin, (await 본문JSON<{ id: number }>(응답)).id);
    }
  });
  await test.step('enabled 에 글자를 넣어 POST /opsapi/notices 를 부른다', async () => {
    const 응답 = await 공지만들기(admin, { title: 고유이름('ARI-FN-278'), body: '형이 다른 값 시험', enabled: '글자' });
    try {
      const 코드 = await verify('형이 다른 값 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 형식 = await verify('형이 다른 값 응답 Content-Type 이 application/problem+json 이다', (응답.headers()['content-type'] ?? '').includes('application/problem+json'), true);
      await verify('형이 다른 값을 보냈을 때도 400 이고 본문이 application/problem+json 형식이다', 코드 && 형식, true);
    } finally {
      if (응답.ok()) await 공지삭제(admin, (await 본문JSON<{ id: number }>(응답)).id);
    }
  });
});
