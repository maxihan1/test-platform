import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 공지만들기, 공지삭제, 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-041',
  name: '운영자 API 로 공지를 만들면 응답의 createdAt 끝에 Z 가 붙는다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 공지번호 = 0;
  try {
    await test.step('고정 운영 키로 [QA] 공지를 만든다', async () => {
      const 응답 = await 공지만들기(admin, { title: 고유이름('ARI UTC'), body: '시각 확인', enabled: false });
      await verify('공지 만들기 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
      const 몸 = await 본문JSON<{ id: number; createdAt: string }>(응답);
      공지번호 = 몸.id;
      await verify('운영자 API 로 공지를 만들면 응답의 createdAt 끝에 Z 가 붙는다', 몸.createdAt.endsWith('Z'), true);
    });
  } finally {
    if (공지번호 > 0) await 공지삭제(admin, 공지번호);
  }
});
