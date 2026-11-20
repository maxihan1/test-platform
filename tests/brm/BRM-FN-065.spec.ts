import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 저장대기가풀릴때까지 } from './helpers/login-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-065',
  name: '골드를 바꾸면 10초 주기 안에 저장돼 「/gm stat」 저장대기가 「아니오」가 된다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    저장주기초: z.number().int().min(1).describe('저장 주기(초) — 기획서의 10초').default(10),
    오차초: z.number().min(0).describe('시간 재기 오차(초)').default(2),
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
  await test.step('「/gm gold 300」을 보낸 뒤 「/gm stat」의 저장대기를 읽는다', async () => {
    await 골드맞추기(game, 300);
    const 값 = await 저장대기가풀릴때까지(game, (params.저장주기초 + params.오차초) * 1000);
    await verify('골드를 바꾸면 10초 주기 안에 저장돼 「/gm stat」 저장대기가 「아니오」가 된다', 값, '아니오');
  });
});
