import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-547',
  name: '우편 비우기 저장이 실패하면 아무것도 주지 않고 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림을 띄운다',
  platforms: ['android'],
  precondition: ['우편 저장이 실패한다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 게임 API 실패를 만드는 길 없음(게임 서버 응답은 모킹할 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「받기」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('우편 비우기 저장이 실패하면 아무것도 주지 않고 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림을 띄운다', await 뜨는지(game, 화면글자('우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요')), true);
  });
});
