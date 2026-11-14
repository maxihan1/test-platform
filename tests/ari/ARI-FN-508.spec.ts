import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-508',
  name: 'size 0 으로 GET /opsapi/grants 를 부르면 1건이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    크기0: z.number().int().describe('한 쪽 개수 — 0 이하').default(0),
    크기101: z.number().int().describe('한 쪽 개수 — 101 이상').default(101),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    크기0건수: z.number().describe('size 0 으로 부른 한 쪽 건수').default(1),
    크기1건수: z.number().describe('size 1 로 부른 한 쪽 건수').default(1),
    쪽최대건수: z.number().describe('size 100 이상으로 부를 때 한 쪽 건수의 상한').default(100),
  }),
  techniques: ['경계값 분석'],
});

interface 쪽 {
  total: number;
  items: unknown[];
}

test(spec, async ({ admin, params, expected }) => {
  await test.step('size 0 으로 GET /opsapi/grants 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/grants', { params: { size: params.크기0 } });
    const 코드 = await verify('size 0 지급 이력 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = await 본문JSON<쪽>(응답).catch(() => ({ total: 0, items: [] }) as 쪽);
    await verify('지급 이력에 지급 건이 하나 이상 있다', 몸.total >= 1, true, { blocker: true });
    const 건수 = await verify('size 0 으로 부른 한 쪽 건수가 기대 결과와 같다', 몸.items.length, expected.크기0건수);
    await verify('size 0 으로 GET /opsapi/grants 를 부르면 1건이 돌아온다', 코드 && 건수, true);
  });
  await test.step('size 1 로 GET /opsapi/grants 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/grants', { params: { size: 1 } });
    const 코드 = await verify('size 1 지급 이력 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = await 본문JSON<쪽>(응답).catch(() => ({ total: 0, items: [] }) as 쪽);
    const 건수 = await verify('size 1 로 부른 한 쪽 건수가 기대 결과와 같다', 몸.items.length, expected.크기1건수);
    await verify('size 1 일 때 GET /opsapi/grants 는 1건이다', 코드 && 건수, true);
  });
  await test.step('size 100 으로 GET /opsapi/grants 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/grants', { params: { size: 100 } });
    const 코드 = await verify('size 100 지급 이력 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = await 본문JSON<쪽>(응답).catch(() => ({ total: 0, items: [] }) as 쪽);
    const 건수 = await verify('size 100 으로 부른 한 쪽 건수가 total 과 100 가운데 작은 수와 같다', 몸.items.length, Math.min(몸.total, expected.쪽최대건수));
    await verify('size 100 일 때 GET /opsapi/grants 는 total 과 100 가운데 작은 수만큼이다', 코드 && 건수, true);
  });
  await test.step('size 101 로 GET /opsapi/grants 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/grants', { params: { size: params.크기101 } });
    const 코드 = await verify('size 101 지급 이력 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 몸 = await 본문JSON<쪽>(응답).catch(() => ({ total: 0, items: [] }) as 쪽);
    const 건수 = await verify('size 101 로 부른 한 쪽 건수가 total 과 100 가운데 작은 수와 같다', 몸.items.length, Math.min(몸.total, expected.쪽최대건수));
    await verify('size 101 일 때도 GET /opsapi/grants 는 total 과 100 가운데 작은 수만큼이다', 코드 && 건수, true);
  });
});
