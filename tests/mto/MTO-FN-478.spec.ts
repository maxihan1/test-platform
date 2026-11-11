import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대비활성화 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 초대화면 } from './pages/invites.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-478',
  name: '초대 코멘트 420자로 초대를 만들면 목록에 새 초대가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  held: '보류 — 관리 화면 초대 폼에 코멘트 칸이 없다',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    안쪽글자수: z.number().int().min(1).max(420).describe('안쪽 시험 값 — 초대 코멘트 글자 수, 1 이상 420 이하').default(420),
    바깥글자수: z.number().int().min(421).describe('바깥 시험 값 — 초대 코멘트 글자 수, 421 이상').default(421),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 초대 = new 초대화면(page);
  const 링크들: string[] = [];

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 초대.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 초대.제목.isVisible(), true, { blocker: true });
    });

    await test.step('초대 코멘트 칸에 420자를 적고 「초대 링크 생성하기」를 누른다', async () => {
      const 링크 = await 초대.코멘트로생성하기(params.안쪽글자수);
      if (링크) 링크들.push(링크);
      await verify('초대 코멘트 420자로 초대를 만들면 목록에 새 초대가 보인다', 링크 !== '', true);
    });

    await test.step('초대 코멘트 칸에 421자를 적고 「초대 링크 생성하기」를 누른다', async () => {
      const 링크 = await 초대.코멘트로생성하기(params.바깥글자수);
      if (링크) 링크들.push(링크);
      await verify('초대 코멘트 421자의 초대는 만들어지지 않는다', 링크 === '', true);
    });
  } finally {
    for (const 링크 of 링크들) await 초대비활성화(page, 링크);
  }
});
