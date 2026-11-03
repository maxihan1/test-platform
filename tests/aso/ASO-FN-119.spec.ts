import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-119',
  name: '「계정 ID」에 계정 번호를 적고 「검색」을 누르면 그 계정의 캐릭터만 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('목록 첫 캐릭터의 계정 번호를 적고 「검색」을 누른다', async () => {
    const 칸들 = await 화면.줄칸글(화면.캐릭터줄들.first());
    const 계정번호 = /\(#(\d+)\)$/.exec(칸들[2] ?? '')?.[1] ?? '';
    await verify('첫 캐릭터의 계정 칸에 계정 번호가 보인다', 계정번호 !== '', true, { blocker: true });
    await 화면.검색('', 계정번호);
    const 계정들 = await Promise.all((await 화면.캐릭터줄들.all()).map(async (줄) => (await 화면.줄칸글(줄))[2] ?? ''));
    const 있음 = await verify('검색 뒤 캐릭터가 한 줄 이상 보인다', 계정들.length > 0, true);
    const 다름없음 = await verify('다른 계정의 캐릭터가 보이지 않는다', 계정들.filter((계정) => !계정.endsWith(`(#${계정번호})`)).join(', '), '');
    await verify('「계정 ID」에 계정 번호를 적고 「검색」을 누르면 그 계정의 캐릭터만 보인다', 있음 && 다름없음, true);
  });
});
