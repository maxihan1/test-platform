import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 공지만들고번호, 공지삭제, 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-006',
  name: '고정 운영 키로 공지를 만들면 작업 기록의 운영자 칸이 qa-admin-key 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    운영자: z.string().describe('작업 기록의 운영자 이름').default('qa-admin-key'),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 제목 = 고유이름('ARI-FN-006');
  let 공지번호 = 0;
  try {
    await test.step('고정 운영 키로 [QA] 공지를 만든 뒤 작업 기록을 그 제목으로 검색한다', async () => {
      공지번호 = await 공지만들고번호(admin, { title: 제목, body: '작업 기록 확인', enabled: false });
      await verify('시험용 공지가 만들어졌다', 공지번호 > 0, true, { blocker: true });
      const 응답 = await admin.get('/opsapi/logs/audit', { params: { q: 제목, size: 50 } });
      const 기록 = (await 본문JSON<{ items: { operator: string; area: string }[] }>(응답)).items.find((x) => x.area === 'NOTICE');
      await verify('고정 운영 키로 공지를 만들면 작업 기록의 운영자 칸이 qa-admin-key 다', 기록?.operator ?? '', expected.운영자);
    });
  } finally {
    if (공지번호 > 0) await 공지삭제(admin, 공지번호);
  }
});
