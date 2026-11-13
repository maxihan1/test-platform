import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-327',
  name: '일일 퀘스트 창에 제목 「일일 퀘스트」와 줄마다 「보상 <골드> 골드 · <경험치> 경험치」와 「<진행>/<목표>」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['quest:kill_imps', 'quest:kill_boss', 'quest:shop_buy'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('일일 퀘스트 창 제목').default('일일 퀘스트'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('일일 퀘스트 창을 연다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 제목 = await verify('일일 퀘스트 창 제목이 「일일 퀘스트」다', await 퀘스트.제목글(), expected.제목);
    const 맞지않는보상 = (await 퀘스트.보상들()).filter((글) => !/^보상 \d+ 골드 · \d+ 경험치$/.test(글.trim()));
    const 보상 = await verify('퀘스트 줄마다 보상이 「보상 <골드> 골드 · <경험치> 경험치」 꼴이다', 맞지않는보상, []);
    const 맞지않는진행 = (await 퀘스트.진행들()).filter((글) => !/^\d+\/\d+$/.test(글.trim()));
    const 진행 = await verify('퀘스트 줄마다 진행이 「<진행>/<목표>」 꼴이다', 맞지않는진행, []);
    await verify('일일 퀘스트 창에 제목 「일일 퀘스트」와 줄마다 「보상 <골드> 골드 · <경험치> 경험치」와 「<진행>/<목표>」가 보인다', 제목 && 보상 && 진행, true);
  });
});
