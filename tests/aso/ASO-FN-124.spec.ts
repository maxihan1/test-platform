import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결과고정풀기 } from './helpers/admin-api.helper.js';
import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-124',
  name: '「모두 비우기」를 누르면 「대기 중」이 「없음」으로 바뀐다',
  precondition: ['결과 고정 대기열에 강화 「Success」가 있다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    빈대기문구: z.string().describe('대기열이 비었을 때 대기 중 글자').default('없음'),
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

  try {
    await test.step('결과 고정 대기열에 강화 「Success」를 넣는다', async () => {
      await 화면.확률탭열기();
      await 화면.강화고정넣기('Success');
    });

    await test.step('「대기 중」에 「강화 Success」가 있는지 확인한다', async () => {
      await verify('「대기 중」에 「강화 Success」가 보인다', (await 화면.대기중.innerText()).includes('강화 Success'), true, { blocker: true });
    });

    await test.step('「모두 비우기」를 누른다', async () => {
      await 화면.결과고정비우기();
      await verify('「모두 비우기」를 누르면 「대기 중」이 「없음」으로 바뀐다', await 화면.대기중.innerText(), expected.빈대기문구);
    });
  } finally {
    await 결과고정풀기(page, 키);
  }
});
