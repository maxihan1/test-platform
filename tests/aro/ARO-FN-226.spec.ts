import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-226',
  name: '정지 창에 사유를 적고 「정지」를 누르면 확인 창 없이 토스트 「qa_player2 정지 처리했습니다」가 뜬다',
  smoke: true,
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    대상아이디: z.string().min(1).describe('제재를 걸 게임 계정 아이디 — 시험용 계정').default('qa_player2'),
    사유: z.string().min(1).max(200).describe('정지 사유 — 1~200자').default('[QA] 정지 등록 시험'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 정지를 풀어 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, params.대상아이디);
      await 적용중제재풀기(page, 계정, 'SUSPEND');
    });

    await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${encodeURIComponent(params.대상아이디)}`);
      await verify('대상 계정 줄에 「정지」 버튼이 보인다', await 화면.줄버튼(params.대상아이디, '정지').isVisible(), true, { blocker: true });
    });

    await test.step('정지 창에 사유를 적고 「정지」를 누른다', async () => {
      await 화면.줄버튼(params.대상아이디, '정지').click();
      await 화면.창.열릴때까지();
      await 화면.창.칸('사유 (1~200자, 유저에게 보일 수 있음)').fill(params.사유);
      await 화면.창.누르기('정지');
      const 떴다 = await 화면.알림.뜰때까지(`${params.대상아이디} 정지 처리했습니다`);
      await verify('정지 창에 사유를 적고 「정지」를 누르면 확인 창 없이 토스트 「qa_player2 정지 처리했습니다」가 뜬다', 떴다, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
