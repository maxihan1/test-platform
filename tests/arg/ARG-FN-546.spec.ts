import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-546',
  name: '첨부 아이템을 게임 API 아이템 기록에서 하나도 못 찾고 골드도 없으면 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['첨부 아이템 기록이 없는 우편이 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 우편의 「받기」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('첨부 아이템을 게임 API 아이템 기록에서 하나도 못 찾고 골드도 없으면 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다', await 뜨는지(game, 화면글자('첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요')), true);
  });
});
