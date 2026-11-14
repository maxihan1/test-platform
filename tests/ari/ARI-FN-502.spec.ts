import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 페이지개수읽기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-502',
  name: 'size 0 으로 GET /opsapi/users 를 부르면 1건이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    아래크기: z.number().int().describe('한 쪽 개수 — 0 이하 정수').default(0),
    하한크기: z.number().int().describe('한 쪽 개수 — 1').default(1),
    상한크기: z.number().int().describe('한 쪽 개수 — 100 이상 정수').default(100),
    넘는크기: z.number().int().describe('한 쪽 개수 — 101 이상 정수').default(101),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    최소건수: z.number().int().describe('한 쪽 최소 건수').default(1),
    최대건수: z.number().int().describe('한 쪽 최대 건수').default(100),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  await test.step('size 0 으로 GET /opsapi/users 를 부른다', async () => {
    const 결과 = await 페이지개수읽기(admin, '/opsapi/users', params.아래크기);
    const 코드 = await verify('size 0 응답 코드가 기대 결과와 같다', 결과.status, expected.응답코드);
    const 개수 = await verify('size 0 응답 items 개수가 최소 건수와 같다', 결과.개수, expected.최소건수);
    await verify('size 0 으로 GET /opsapi/users 를 부르면 1건이 돌아온다', 코드 && 개수, true);
  });
  await test.step('size 1 로 GET /opsapi/users 를 부른다', async () => {
    const 결과 = await 페이지개수읽기(admin, '/opsapi/users', params.하한크기);
    const 코드 = await verify('size 1 응답 코드가 기대 결과와 같다', 결과.status, expected.응답코드);
    const 개수 = await verify('size 1 응답 items 개수가 최소 건수와 같다', 결과.개수, expected.최소건수);
    await verify('size 1 일 때 GET /opsapi/users 는 1건이다', 코드 && 개수, true);
  });
  await test.step('size 100 으로 GET /opsapi/users 를 부른다', async () => {
    const 결과 = await 페이지개수읽기(admin, '/opsapi/users', params.상한크기);
    const 코드 = await verify('size 100 응답 코드가 기대 결과와 같다', 결과.status, expected.응답코드);
    const 개수 = await verify('size 100 응답 items 개수가 total 과 최대 건수 가운데 작은 수와 같다', 결과.개수, Math.min(결과.전체, expected.최대건수));
    await verify('size 100 일 때 GET /opsapi/users 는 total 과 100 가운데 작은 수만큼이다', 코드 && 개수, true);
  });
  await test.step('size 101 로 GET /opsapi/users 를 부른다', async () => {
    const 결과 = await 페이지개수읽기(admin, '/opsapi/users', params.넘는크기);
    const 코드 = await verify('size 101 응답 코드가 기대 결과와 같다', 결과.status, expected.응답코드);
    const 개수 = await verify('size 101 응답 items 개수가 total 과 최대 건수 가운데 작은 수와 같다', 결과.개수, Math.min(결과.전체, expected.최대건수));
    await verify('size 101 일 때도 GET /opsapi/users 는 total 과 100 가운데 작은 수만큼이다', 코드 && 개수, true);
  });
});
