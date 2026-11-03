import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결과고정풀기 } from './helpers/admin-api.helper.js';
import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-123',
  name: '「결과 고정」에서 강화 「Success」를 고르고 「추가」를 누르면 「대기 중」에 「강화 Success」가 보인다',
  precondition: ['맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    대기문구: z.string().describe('대기 중에 보일 고정 결과').default('강화 Success'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);
  const 키 = params.password ?? '';

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(키);
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('「확률·결과 고정」 탭을 연다', async () => {
    await 화면.확률탭열기();
    await verify('「결과 고정 (다음 판정부터 차례로)」 카드가 보인다', await 화면.결과고정제목.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('「결과 고정」에서 강화 「Success」를 고르고 「추가」를 누른다', async () => {
      await 화면.강화고정넣기('Success');
      await verify('「결과 고정」에서 강화 「Success」를 고르고 「추가」를 누르면 「대기 중」에 「강화 Success」가 보인다', (await 화면.대기중.innerText()).includes(expected.대기문구), true);
    });
  } finally {
    await 결과고정풀기(page, 키);
  }
});
