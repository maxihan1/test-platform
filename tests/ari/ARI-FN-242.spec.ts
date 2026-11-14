import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경계글, 공지만들고기록, 공지번호들삭제 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-242',
  name: '공지 제목 0자로 만들면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    빈제목길이: z.number().int().min(0).describe('비운 공지 제목 글자 수 — 0자').default(0),
    짧은제목길이: z.number().int().min(0).describe('가장 짧은 공지 제목 글자 수 — 1~60자면 같은 결과').default(1),
    긴제목길이: z.number().int().min(0).describe('가장 긴 공지 제목 글자 수 — 1~60자면 같은 결과').default(60),
    넘친제목길이: z.number().int().min(0).describe('넘친 공지 제목 글자 수 — 61~100자면 같은 결과').default(61),
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
    await test.step('제목 0자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 경계글(params.빈제목길이, '[QA] '), body: '제목 길이 시험', enabled: false }, 만든번호들);
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 만들기.응답.status(), expected.거절코드);
      const 종류 = await verify('응답 code 가 INVALID 다', 만들기.몸.code ?? '', 'INVALID');
      await verify('공지 제목 0자로 만들면 400 INVALID 다', 코드 && 종류, true);
    });
    await test.step('제목 1자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 경계글(params.짧은제목길이, '[QA] '), body: '제목 길이 시험', enabled: false }, 만든번호들);
      await verify('공지 제목 1자일 때 200 으로 만들어진다', 만들기.응답.status(), expected.성공코드);
    });
    await test.step('제목 60자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 경계글(params.긴제목길이, '[QA] '), body: '제목 길이 시험', enabled: false }, 만든번호들);
      await verify('공지 제목 60자일 때 200 으로 만들어진다', 만들기.응답.status(), expected.성공코드);
    });
    await test.step('제목 61자로 공지를 만든다', async () => {
      const 만들기 = await 공지만들고기록(admin, { title: 경계글(params.넘친제목길이, '[QA] '), body: '제목 길이 시험', enabled: false }, 만든번호들);
      const 코드 = await verify('응답 코드가 기대 결과와 같다', 만들기.응답.status(), expected.거절코드);
      const 종류 = await verify('응답 code 가 INVALID 다', 만들기.몸.code ?? '', 'INVALID');
      await verify('공지 제목 61자일 때 400 INVALID 다', 코드 && 종류, true);
    });
  } finally {
    await 공지번호들삭제(admin, 만든번호들);
  }
});
