import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 봇이본글기다리기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-178',
  name: '상점에 없는 아이템을 요청하면 「상점에서 팔지 않는 아이템입니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정의 봇이 로비에 있다'],
  techniques: ['동등 분할'],
  elements: ['item:imp_horn'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  let 봇 = '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 그 계정의 봇을 켠다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      봇 = await 봇켜기(admin, { user: 아이디, pass: 비밀번호 });
    });
    await test.step('봇이 로비에 있는지 확인한다', async () => {
      await verify('봇이 접속자 목록에 있다', (await 접속자(admin)).bots.includes(봇), true, { blocker: true });
    });
    await test.step('봇이 상점에 없는 「임프의 뿔」 구매를 요청한다', async () => {
      await 봇시키기(admin, 봇, 'buy:임프의 뿔');
      const 글 = await 봇이본글기다리기(admin, 봇, '상점에서 팔지 않는 아이템입니다');
      await verify('상점에 없는 아이템을 요청하면 「상점에서 팔지 않는 아이템입니다」 오류 알림이 뜬다', 글 !== null, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
