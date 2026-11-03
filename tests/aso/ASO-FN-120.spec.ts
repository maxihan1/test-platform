import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-120',
  name: '없는 이름으로 검색하면 「검색 결과가 없습니다.」 알림이 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
    없는이름: z.string().min(1).describe('없는 캐릭터 이름 — 어느 캐릭터 이름에도 들지 않는 글자').default('aso-없는-캐릭터-zz'),
  }),
  expected: z.object({
    알림문구: z.string().describe('검색 결과가 없을 때 알림 문구').default('검색 결과가 없습니다.'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('없는 이름을 적고 「검색」을 누른다', async () => {
    await 화면.검색(params.없는이름, '');
    await 화면.성공알림.waitFor();
    await verify('없는 이름으로 검색하면 「검색 결과가 없습니다.」 알림이 보인다', await 화면.성공알림.innerText(), expected.알림문구);
  });
});
