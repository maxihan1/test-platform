import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { PNG만들기 } from './helpers/media.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-799',
  name: '본문 없이 설문만 넣고 「게시」를 누르면 게시된다',
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
  const 올린글: string[] = [];

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('본문 없이 설문만 채워 「게시」를 누른다', async () => {
      await 홈.작성.설문.click();
      await 글쓰기.항목채우기(1, '첫째 항목');
      await 글쓰기.항목칸생길때까지(2);
      await 글쓰기.항목채우기(2, '둘째 항목');
      const 결과 = await 글쓰기.게시해보기();
      if (결과.글번호 !== undefined) 올린글.push(결과.글번호);
      await verify('본문 없이 설문만 넣고 「게시」를 누르면 게시된다', 결과.게시됨, true);
    });

    await test.step('본문 없이 이미지만 첨부해 「게시」를 누른다', async () => {
      await 홈.열기();
      await 글쓰기.이미지넣기(await PNG만들기(page, '본문없음.png', 64, 64, true), 1);
      const 결과 = await 글쓰기.대체텍스트없이게시하기();
      if (결과.글번호 !== undefined) 올린글.push(결과.글번호);
      await verify('본문 없이 이미지만 넣어도 게시된다', 결과.게시됨, true);
    });
  } finally {
    for (const 번호 of 올린글) await 글지우기API(page, 번호);
  }
});
