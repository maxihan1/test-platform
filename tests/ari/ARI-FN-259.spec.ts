import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자, 시각 } from './helpers/api.helper.js';
import { 점검바꾸고되돌리기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-259',
  name: '문구 0자로 점검을 켜면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    빈문구길이: z.number().int().min(0).describe('비운 점검 문구 글자 수 — 0자').default(0),
    짧은문구길이: z.number().int().min(0).describe('가장 짧은 점검 문구 글자 수 — 1~300자면 같은 결과').default(1),
  }),
  expected: z.object({
    거절코드: z.number().describe('거절 응답 코드').default(400),
    성공코드: z.number().describe('성공 응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  await test.step('문구 0자로 점검을 켠다', async () => {
    const { 응답, 몸 } = await 점검바꾸고되돌리기(admin, { enabled: true, message: 글자(params.빈문구길이), startsAt: 시각(60), endsAt: null, allowedAccountIds: [] });
    const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.거절코드);
    const 종류 = await verify('응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
    await verify('문구 0자로 점검을 켜면 400 INVALID 다', 코드 && 종류, true);
  });
  await test.step('시작을 1시간 뒤로 문구 1자를 넣어 점검을 켠다', async () => {
    const { 응답 } = await 점검바꾸고되돌리기(admin, { enabled: true, message: 글자(params.짧은문구길이), startsAt: 시각(60), endsAt: null, allowedAccountIds: [] });
    await verify('문구 1자일 때 200 으로 점검이 켜진다', 응답.status(), expected.성공코드);
  });
});
