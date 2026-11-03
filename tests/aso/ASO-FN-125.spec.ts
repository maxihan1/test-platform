import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결과고정풀기 } from './helpers/admin-api.helper.js';
import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-FN-125',
  name: '한 브라우저에서 강화 「Success」를 추가하면 다른 브라우저의 「대기 중」에도 「강화 Success」가 보인다',
  precondition: ['브라우저 둘에 맞는 키를 저장했다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    대기문구: z.string().describe('다른 브라우저 대기 중에 보일 고정 결과').default('강화 Success'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);
  const 키 = params.password ?? '';
  const 브라우저 = page.context().browser();
  if (브라우저 === null) throw new Error('다른 브라우저 묶음을 만들 브라우저가 없다');
  const 둘째묶음 = await 브라우저.newContext();
  const 둘째화면 = new 백오피스화면(await 둘째묶음.newPage());

  try {
  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(키);
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

    await test.step('다른 브라우저에서 맞는 키를 저장한다', async () => {
      await 둘째화면.열기();
      const 응답 = await 둘째화면.키저장하고목록기다리기(키);
      await verify('다른 브라우저의 키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
      await 화면.확률탭열기();
      await 둘째화면.확률탭열기();
    });

    await test.step('한 브라우저에서 강화 「Success」를 추가하고 다른 브라우저에서 「확률·결과 고정」을 연다', async () => {
      let 둘째글 = '';
      for (let 차례 = 0; 차례 < 3; 차례 += 1) {
        await 화면.강화고정넣기('Success');
        await 둘째화면.확률탭다시열기();
        둘째글 = await 둘째화면.대기중.innerText();
        if (둘째글.includes(expected.대기문구)) break;
        await 화면.확률탭다시열기();
        if ((await 화면.대기중.innerText()).includes(expected.대기문구)) break;
      }
      await verify('한 브라우저에서 강화 「Success」를 추가하면 다른 브라우저의 「대기 중」에도 「강화 Success」가 보인다', 둘째글.includes(expected.대기문구), true);
    });
  } finally {
    await 결과고정풀기(page, 키);
    await 둘째묶음.close();
  }
});
