import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 공지만들고번호, 공지삭제 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-264',
  name: '공지를 만든 뒤 GET /opsapi/logs/audit 를 검색하면 그 작업 기록이 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('[QA] 공지를 만든 뒤 q 에 그 제목을 넣어 GET /opsapi/logs/audit 를 부른다', async () => {
    let 공지번호 = 0;
    try {
      const 제목 = 고유이름('ARI-FN-264');
      공지번호 = await 공지만들고번호(admin, { title: 제목, body: '작업 기록 시험', enabled: false });
      await verify('시험용 공지가 만들어졌다', 공지번호 > 0, true, { blocker: true });
      const 응답 = await admin.get('/opsapi/logs/audit', { params: { q: 제목 } });
      const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { area?: string }[] };
      const 코드 = await verify('GET /opsapi/logs/audit 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 기록 = await verify('items 에 NOTICE 영역 기록이 있다', (몸.items ?? []).some((r) => r.area === 'NOTICE'), true);
      await verify('공지를 만든 뒤 GET /opsapi/logs/audit 를 검색하면 그 작업 기록이 보인다', 코드 && 기록, true);
    } finally {
      if (공지번호 > 0) await 공지삭제(admin, 공지번호);
    }
  });
});
