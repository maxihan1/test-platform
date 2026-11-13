import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-315',
  name: '길드 이름 칸에 13자를 넣으면 12자만 들어간다',
  platforms: ['android'],
  precondition: ['길드가 없고 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    긴이름글자수: z.number().int().min(1).describe('길드 이름 칸에 넣을 글자 수 — 한도보다 1자 많은 13자').default(13),
    짧은이름글자수: z.number().int().min(1).describe('길드 이름 칸에 넣고 만들기를 누를 글자 수 — 한도보다 1자 적은 1자').default(1),
  }),
  expected: z.object({
    들어간글자수: z.number().describe('13자를 넣었을 때 들어간 글자 수').default(12),
    알림글: z.string().describe('이름이 짧을 때 알림 문구').default('길드 이름은 2~12자로 지어 주세요'),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ game, params, expected }) => {
  let 창: 길드창;

  await test.step('일반 회원으로 로비에 들어가 길드 창을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    창 = await 길드창.열기(game);
    await verify('길드 창에 「만들기 · 500G」 버튼이 보인다', await 창.길드없는지(), true, { blocker: true });
  });

  await test.step('길드 창 이름 칸에 13자를 넣는다', async () => {
    const 들어간글 = await 창.이름넣기('a'.repeat(params.긴이름글자수));
    await verify('길드 이름 칸에 13자를 넣으면 12자만 들어간다', 들어간글.length, expected.들어간글자수);
  });

  await test.step('길드 창 이름 칸에 1자를 넣고 「만들기 · 500G」를 누른다', async () => {
    await 창.이름넣기('a'.repeat(params.짧은이름글자수));
    await 창.만들기누르기();
    await verify('1자 이름에는 「길드 이름은 2~12자로 지어 주세요」 알림이 뜬다', await 창.hud.알림.뜨는지(expected.알림글), true);
  });
});
