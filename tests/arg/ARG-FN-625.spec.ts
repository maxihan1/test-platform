import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-625',
  name: '길드장만 「초대할 캐릭터 이름」 칸에 이름을 넣고 「초대」를 누를 수 있고, 접속 중이고 길드가 없는 캐릭터만 초대하면 「<이름> 님을 길드에 초대했습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['내가 길드장이고 길드가 없는 캐릭터가 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 이름으로 「초대」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드장만 「초대할 캐릭터 이름」 칸에 이름을 넣고 「초대」를 누를 수 있고, 접속 중이고 길드가 없는 캐릭터만 초대하면 「<이름> 님을 길드에 초대했습니다」가 뜬다', await 뜨는지(game, 화면글자('초대할 캐릭터 이름')), true);
  });
});
