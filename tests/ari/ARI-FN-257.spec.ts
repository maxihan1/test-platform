import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자 } from './helpers/api.helper.js';
import { 점검바꾸고되돌리기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-257',
  name: '점검 문구 300자로 변경하면 200 이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    긴문구길이: z.number().int().min(0).describe('가장 긴 점검 문구 글자 수 — 0~300자면 같은 결과').default(300),
    넘친문구길이: z.number().int().min(0).describe('넘친 점검 문구 글자 수 — 301~400자면 같은 결과').default(301),
  }),
  expected: z.object({
    성공코드: z.number().describe('성공 응답 코드').default(200),
    거절코드: z.number().describe('거절 응답 코드').default(400),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  await test.step('꺼진 채 문구 300자로 점검 설정을 변경한다', async () => {
    const { 응답 } = await 점검바꾸고되돌리기(admin, { enabled: false, message: 글자(params.긴문구길이), startsAt: null, endsAt: null, allowedAccountIds: [] });
    await verify('점검 문구 300자로 변경하면 200 이다', 응답.status(), expected.성공코드);
  });
  await test.step('꺼진 채 문구 301자로 점검 설정을 변경한다', async () => {
    const { 응답, 몸 } = await 점검바꾸고되돌리기(admin, { enabled: false, message: 글자(params.넘친문구길이), startsAt: null, endsAt: null, allowedAccountIds: [] });
    const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.거절코드);
    const 종류 = await verify('응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
    await verify('점검 문구 301자일 때 400 INVALID 다', 코드 && 종류, true);
  });
});
