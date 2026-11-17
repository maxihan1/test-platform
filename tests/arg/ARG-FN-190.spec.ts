import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 봇이본글기다리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-190',
  name: '장착 중인 아이템 판매를 요청하면 「장착 중인 아이템은 팔 수 없습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정의 봇이 「녹슨 단검」을 끼고 로비에 있다'],
  techniques: ['동등 분할', '상태 전이'],
  elements: ['item:rusty_dagger'],
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
      await 봇시키기(admin, 봇, 'buy:녹슨 단검');
      await 봇이본글기다리기(admin, 봇, '녹슨 단검 1개 구매');
      await 봇시키기(admin, 봇, 'equip:녹슨 단검');
    });
    await test.step('봇이 「녹슨 단검」을 끼었는지 확인한다', async () => {
      await verify('봇이 「녹슨 단검 장착」 알림을 받았다', (await 봇이본글기다리기(admin, 봇, '녹슨 단검 장착')) !== null, true, { blocker: true });
    });
    await test.step('봇이 장착 중인 「녹슨 단검」 판매를 요청한다', async () => {
      await 봇시키기(admin, 봇, 'sell:녹슨 단검');
      const 글 = await 봇이본글기다리기(admin, 봇, '장착 중인 아이템은 팔 수 없습니다');
      await verify('장착 중인 아이템 판매를 요청하면 「장착 중인 아이템은 팔 수 없습니다」 오류 알림이 뜬다', 글 !== null, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
