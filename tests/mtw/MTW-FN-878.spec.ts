import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 글쓰기시도API, 미디어올리기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { PNG만들기 } from './helpers/media.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-878',
  name: '미디어 4개를 붙여 게시하면 게시된다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    한도개수: z.number().int().min(1).max(4).describe('한도에 맞춰 붙이는 미디어 수 — 1 이상 4 이하').default(4),
    넘는개수: z.number().int().min(5).max(6).describe('한도를 넘겨 붙이는 미디어 수 — 5 이상 6 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 올린글: string[] = [];

  const 올리기 = async (개수: number): Promise<string[]> => {
    const 번호들: string[] = [];
    for (let 번째 = 1; 번째 <= 개수; 번째 += 1) 번호들.push(await 미디어올리기API(page, await PNG만들기(page, `미디어${String(번째)}.png`, 64, 64, true)));
    return 번호들;
  };

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('미디어 4개를 붙인 글을 API 로 게시한다', async () => {
      const 결과 = await 글쓰기시도API(page, { status: `미디어 한도 확인 ${표식('m4')}`, visibility: 'public', media_ids: await 올리기(params.한도개수) });
      if (결과.글번호 !== undefined) 올린글.push(결과.글번호);
      await verify('미디어 4개를 붙여 게시하면 게시된다', 결과.상태, 200);
    });

    await test.step('미디어 5개를 붙인 글을 API 로 게시한다', async () => {
      const 결과 = await 글쓰기시도API(page, { status: `미디어 초과 확인 ${표식('m5')}`, visibility: 'public', media_ids: await 올리기(params.넘는개수) });
      if (결과.글번호 !== undefined) 올린글.push(결과.글번호);
      await verify('미디어 5개에는 「최대 4개까지 첨부할 수 있습니다」가 돌아온다', 결과.오류.includes('최대 4개까지 첨부할 수 있습니다'), true);
    });
  } finally {
    for (const 번호 of 올린글) await 글지우기API(page, 번호);
  }
});
