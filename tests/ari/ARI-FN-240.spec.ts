import { defineCase, test, verify } from '@platform/kit';

import { 고유이름, 시각 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제, 시각같음 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-240',
  name: '제목 · 내용 · 기간을 넣어 공지를 만들면 넣은 값의 공지 한 건이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('제목 · 내용 · 기간을 넣어 꺼진 [QA] 공지를 만든다', async () => {
      const 제목 = 고유이름('ARI-FN-240');
      const 내용 = '공지 만들기 시험 내용';
      const 시작 = 시각(60);
      const 끝 = 시각(120);
      const 만들기 = await 공지만들고기록(admin, { title: 제목, body: 내용, startsAt: 시작, endsAt: 끝, enabled: false }, 만든번호들);
      const 코드 = await verify('응답 코드가 200 이다', 만들기.응답.status(), 200);
      const 한건 = await verify('응답이 공지 한 건이다', typeof 만들기.몸.id === 'number', true);
      const 제목같음 = await verify('응답 title 이 넣은 제목과 같다', 만들기.몸.title, 제목);
      const 내용같음 = await verify('응답 body 가 넣은 내용과 같다', 만들기.몸.body, 내용);
      const 시작같음 = await verify('응답 startsAt 이 넣은 시작과 같다', 시각같음(만들기.몸.startsAt, 시작), true);
      const 끝같음 = await verify('응답 endsAt 이 넣은 끝과 같다', 시각같음(만들기.몸.endsAt, 끝), true);
      await verify('제목 · 내용 · 기간을 넣어 공지를 만들면 넣은 값의 공지 한 건이 돌아온다', 코드 && 한건 && 제목같음 && 내용같음 && 시작같음 && 끝같음, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
