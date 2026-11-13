import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-467',
  name: '그 계정으로 로그인하고 메뉴를 확인하면 캐릭터를 불러온 뒤 우편함을 한 번 읽어 안 읽은 우편 수를 메뉴에 붙인다',
  platforms: ['android'],
  precondition: ['안 읽은 우편이 있는 계정이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('그 계정으로 로그인하고 메뉴를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('그 계정으로 로그인하고 메뉴를 확인하면 캐릭터를 불러온 뒤 우편함을 한 번 읽어 안 읽은 우편 수를 메뉴에 붙인다', await 있는지(game, 공통HUD.상단바), true);
  });
});
