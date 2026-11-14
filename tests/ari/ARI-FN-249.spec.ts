import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 시각 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 공지수정, 시각같음 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-249',
  name: 'startsAt 없이 공지를 수정하면 startsAt 이 수정한 시각 updatedAt 과 같아진다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  let 공지번호 = 0;
  try {
    await test.step('시작이 1시간 뒤인 [QA] 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-249'), body: '시작 시각 수정 시험', startsAt: 시각(60), enabled: false }, 만든번호들);
      공지번호 = 만들기.몸.id ?? 0;
      await verify('시작이 1시간 뒤인 공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
    });
    await test.step('시작이 1시간 뒤인 [QA] 공지를 startsAt 없이 수정한다', async () => {
      const 응답 = await 공지수정(admin, 공지번호, { title: 고유이름('ARI-FN-249 수정'), body: '시작 시각 수정 시험', enabled: false });
      const 몸 = (await 응답.json().catch(() => ({}))) as { startsAt?: string; updatedAt?: string };
      await verify('수정 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
      await verify('startsAt 없이 공지를 수정하면 startsAt 이 수정한 시각 updatedAt 과 같아진다', 시각같음(몸.startsAt, 몸.updatedAt), true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
