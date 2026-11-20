import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 메뉴버튼차례 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-512',
  name: '메뉴 버튼 차례를 읽으면 메뉴 버튼이 위에서부터 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」 차례다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('메뉴 버튼 차례를 읽는다', async () => {
    await verify('메뉴 버튼 차례를 읽으면 메뉴 버튼이 위에서부터 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」 차례다', await 메뉴버튼차례(game), '가방 · 상점 · 퀘스트 · 우편 · 친구 · 길드');
  });
});
