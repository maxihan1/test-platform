import { defineCase, test, verify } from '@platform/kit';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 공지수정 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-248',
  name: '공지 제목을 수정하면 수정한 제목의 공지 한 건이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  let 공지번호 = 0;
  try {
    await test.step('수정할 [QA] 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-248'), body: '공지 수정 시험', enabled: false }, 만든번호들);
      공지번호 = 만들기.몸.id ?? 0;
      await verify('수정할 공지를 만들었다', 만들기.응답.status(), 200, { blocker: true });
    });
    await test.step('만든 [QA] 공지의 제목을 PUT /opsapi/notices/{id} 로 수정한다', async () => {
      const 새제목 = 고유이름('ARI-FN-248 수정');
      const 응답 = await 공지수정(admin, 공지번호, { title: 새제목, body: '공지 수정 시험', enabled: false });
      const 몸 = (await 응답.json().catch(() => ({}))) as { id?: number; title?: string };
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 번호 = await verify('응답 id 가 수정한 공지의 번호와 같다', 몸.id, 공지번호);
      const 제목 = await verify('응답 title 이 수정한 제목과 같다', 몸.title, 새제목);
      await verify('공지 제목을 수정하면 수정한 제목의 공지 한 건이 돌아온다', 코드 && 번호 && 제목, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
