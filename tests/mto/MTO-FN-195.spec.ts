import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대비활성화 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 초대화면 } from './pages/invites.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-195',
  name: '초대 링크를 만들면 목록에 링크 칸 · 「복사」 · 「이용 수」 「0 / 1」 · 「비활성화」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 초대 = new 초대화면(page);
  let 링크 = '';

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 초대.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 초대.제목.isVisible(), true, { blocker: true });
    });

    await test.step('「사용 횟수 제한」 1회로 「초대 링크 생성하기」를 누른다', async () => {
      링크 = await 초대.생성하기('1회');
      const 칸 = await verify('링크 칸이 보인다', await 초대.링크칸(링크).isVisible(), true);
      const 복사 = await verify('「복사」가 보인다', await 초대.복사(링크).isVisible(), true);
      const 이용 = await verify('「이용 수」 「0 / 1」이 보인다', await 초대.이용수(링크, '0 / 1').isVisible(), true);
      const 비활성 = await verify('「비활성화」가 보인다', await 초대.비활성화링크(링크).isVisible(), true);
      await verify('초대 링크를 만들면 목록에 링크 칸 · 「복사」 · 「이용 수」 「0 / 1」 · 「비활성화」가 보인다', 칸 && 복사 && 이용 && 비활성, true);
    });

    await test.step('케이스가 만든 초대의 「비활성화」를 누른다', async () => {
      await 초대.비활성화하기(링크);
      await verify('「비활성화」한 케이스 초대 줄은 「만료됨」으로 보인다', await 초대.만료표시(링크).isVisible(), true);
    });
  } finally {
    if (링크) await 초대비활성화(page, 링크);
  }
});
