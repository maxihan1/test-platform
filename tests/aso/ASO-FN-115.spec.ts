import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-115',
  name: '맞는 키로 「키 저장」을 누르면 캐릭터 목록에 캐릭터 줄이 보인다',
  precondition: ['키를 넣지 않았다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 키 없이 연다', async () => {
    await 화면.열기();
    await verify('캐릭터 목록이 비어 있다', await 화면.캐릭터줄들.count(), 0, { blocker: true });
  });

  await test.step('맞는 키를 적고 「키 저장」을 누른다', async () => {
    await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('맞는 키로 「키 저장」을 누르면 캐릭터 목록에 캐릭터 줄이 보인다', (await 화면.캐릭터줄들.count()) > 0, true);
  });
});
