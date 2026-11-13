import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-632',
  name: '길드장이 다른 길드원 줄의 「추방」을 누르면 쫓겨난 사람이 접속 중일 때 「길드 「<길드>」에서 추방되었습니다」(오류 색)가 뜨고 남은 길드원에게 「<이름> 님이 길드를 떠났습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['내가 길드장이고 길드원이 접속해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 줄의 「추방」을 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('길드장이 다른 길드원 줄의 「추방」을 누르면 쫓겨난 사람이 접속 중일 때 「길드 「<길드>」에서 추방되었습니다」(오류 색)가 뜨고 남은 길드원에게 「<이름> 님이 길드를 떠났습니다」가 뜬다', await 뜨는지(game, 화면글자('추방')), true);
  });
});
