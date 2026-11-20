import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-423',
  name: '접속 중에 점검이 켜지면 30초 주기 안에 내보내져 「서버 점검 중」 창이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:점검=켜짐', 'state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    안내문구: z.string().min(1).describe('점검 안내 문구 — 아무 글이나 된다').default('[QA] 점검 시험'),
    오차초: z.number().min(0).describe('주기를 넘겨 기다리는 여유(초)').default(5),
  }),
  expected: z.object({
    주기초: z.number().describe('점검 확인 주기(초)').default(30),
  }),
});

test(spec, async ({ game, driver, admin, params, expected }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('점검 끄기', () => 점검끄기(admin));
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('운영툴에서 허용 계정 없이 점검을 켜고 기다린다', async () => {
    await 점검켜기(admin, { 안내: params.안내문구 });
    const 떴다 = await 안내창.제목이될때까지(game, '서버 점검 중', (expected.주기초 + params.오차초) * 1000);
    await verify('접속 중에 점검이 켜지면 30초 주기 안에 내보내져 「서버 점검 중」 창이 보인다', 떴다, true);
  });
});
