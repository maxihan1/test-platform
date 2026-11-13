import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 글자 } from './helpers/api.helper.js';
import { 공지만들고기록, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-244',
  name: '공지 내용 0자로 만들면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    빈내용길이: z.number().int().min(0).describe('비운 공지 내용 글자 수 — 0자').default(0),
    짧은내용길이: z.number().int().min(0).describe('가장 짧은 공지 내용 글자 수 — 1~1,000자면 같은 결과').default(1),
    긴내용길이: z.number().int().min(0).describe('가장 긴 공지 내용 글자 수 — 1~1,000자면 같은 결과').default(1000),
    넘친내용길이: z.number().int().min(0).describe('넘친 공지 내용 글자 수 — 1,001~1,100자면 같은 결과').default(1001),
  }),
  expected: z.object({
    거절코드: z.number().describe('거절 응답 코드').default(400),
    성공코드: z.number().describe('성공 응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  const 만든번호들: number[] = [];
  try {
    await test.step('내용 0자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-244 0자'), body: 글자(params.빈내용길이), enabled: false }, 만든번호들);
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 만들기.응답.status(), expected.거절코드);
      const 종류 = await verify('응답 code 가 INVALID 다', 만들기.몸.code ?? '', 'INVALID');
      await verify('공지 내용 0자로 만들면 400 INVALID 다', 코드 && 종류, true);
    });
    await test.step('내용 1자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-244 1자'), body: 글자(params.짧은내용길이), enabled: false }, 만든번호들);
      await verify('공지 내용 1자일 때 200 으로 만들어진다', 만들기.응답.status(), expected.성공코드);
    });
    await test.step('내용 1,000자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-244 1000자'), body: 글자(params.긴내용길이), enabled: false }, 만든번호들);
      await verify('공지 내용 1,000자일 때 200 으로 만들어진다', 만들기.응답.status(), expected.성공코드);
    });
    await test.step('내용 1,001자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 고유이름('ARI-FN-244 1001자'), body: 글자(params.넘친내용길이), enabled: false }, 만든번호들);
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 만들기.응답.status(), expected.거절코드);
      const 종류 = await verify('응답 code 가 INVALID 다', 만들기.몸.code ?? '', 'INVALID');
      await verify('공지 내용 1,001자일 때 400 INVALID 다', 코드 && 종류, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
