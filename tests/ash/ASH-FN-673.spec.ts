import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 오류 } from './helpers/api.helper.js';
import { 다른서버에서GM골드 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-673',
  name: 'QA 가 아닌 환경에서 GM API 를 부르면 404 「GM_DISABLED」다',
  platforms: ['android'],
  precondition: ['QA 가 아닌 서버가 있다'],
  held: '보류 — QA 가 아닌 서버가 없음',
  techniques: ['동등 분할'],
  params: z.object({
    서버주소: z.string().describe('QA 가 아닌 서버의 기본 주소 — http 로 시작'),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('QA 가 아닌 서버가 있는지 확인한다', async () => {
    const 응답 = await request.get(`${params.서버주소.replace(/\/+$/, '')}/health`);
    await verify('QA 가 아닌 서버가 있다', 응답.ok(), true, { blocker: true });
  });
  await test.step('GM 골드 지급을 부른다', async () => {
    const 응답 = await 다른서버에서GM골드(request, params.서버주소);
    const 본문값 = await 오류(응답);
    const 상태 = await verify('응답 코드가 404 이다', 응답.status(), 404);
    const 코드 = await verify('오류 코드가 「GM_DISABLED」이다', 본문값.code, 'GM_DISABLED');
    await verify('QA 가 아닌 환경에서 GM API 를 부르면 404 「GM_DISABLED」다', 상태 && 코드, true);
  });
});
