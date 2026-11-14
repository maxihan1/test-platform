import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-362',
  name: '「설문 추가」를 누르면 항목 칸이 2개 보인다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('작성 상자에서 「설문 추가」를 누른다', async () => {
      await 홈.작성.설문.click();
      await 글쓰기.기간선택.waitFor();
      await verify('「설문 추가」를 누르면 항목 칸이 2개 보인다', await 글쓰기.항목칸들.count(), 2);
    });

    await test.step('설문 항목을 4개까지 늘린다', async () => {
      for (let 번째 = 1; 번째 <= 4; 번째 += 1) {
        const 있다 = await 글쓰기.항목채우기(번째, `항목 ${String(번째)}`);
        if (!있다 || !(await 글쓰기.항목칸생길때까지(번째 + 1))) break;
      }
      await verify('설문 항목은 4개까지 늘어난다', await 글쓰기.항목칸들.count(), 4);
    });

    await test.step('설문 항목이 4개일 때 항목을 더 늘려 본다', async () => {
      const 개수 = await 글쓰기.항목칸들.count();
      await 글쓰기.항목채우기(개수, '더 늘려 본 항목');
      const 다섯째 = await 글쓰기.항목칸생길때까지(5);
      await verify('다섯째 항목은 더해지지 않는다', 다섯째, false);
    });

    await test.step('설문 항목을 하나만 채우고 「게시」를 누른다', async () => {
      await 홈.열기();
      await 홈.작성.쓰기('설문 항목 하나 확인');
      await 홈.작성.설문.click();
      await 글쓰기.항목채우기(1, '하나뿐인 항목');
      const 결과 = await 글쓰기.게시해보기();
      글번호 = 결과.글번호;
      await verify('항목이 하나뿐인 설문은 게시되지 않는다', 결과.게시됨, false);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
