import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-350',
  name: '퀘스트 창을 열면 퀘스트 창에 「보상 150 골드 · 200 경험치」 「/30」, 「보상 300 골드 · 400 경험치」 「/1」, 「보상 50 골드 · 50 경험치」 「/1」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['quest:kill_imps', 'quest:kill_boss', 'quest:shop_buy'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    보상들: z
      .string()
      .describe('퀘스트 줄 보상')
      .default('보상 150 골드 · 200 경험치 | 보상 300 골드 · 400 경험치 | 보상 50 골드 · 50 경험치'),
    목표들: z.string().describe('퀘스트 줄 목표').default('/30 | /1 | /1'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('일일 퀘스트 창의 세 줄을 확인한다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 보상 = await verify('퀘스트 줄의 보상이 「보상 150 골드 · 200 경험치」, 「보상 300 골드 · 400 경험치」, 「보상 50 골드 · 50 경험치」다', (await 퀘스트.보상들()).join(' | '), expected.보상들);
    const 목표 = await verify('퀘스트 줄의 목표가 「/30」, 「/1」, 「/1」이다', (await 퀘스트.진행들()).map((글) => 글.replace(/^\d+/, '')).join(' | '), expected.목표들);
    await verify(
      '퀘스트 창을 열면 퀘스트 창에 「보상 150 골드 · 200 경험치」 「/30」, 「보상 300 골드 · 400 경험치」 「/1」, 「보상 50 골드 · 50 경험치」 「/1」이 보인다',
      보상 && 목표,
      true,
    );
  });
});
