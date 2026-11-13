import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 왼쪽메뉴차례 } from './helpers/lobby-place.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-316',
  name: '로비 왼쪽에 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」가 위에서 아래 차례로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    차례: z.string().describe('로비 왼쪽 메뉴 글자 차례').default('가방 · 상점 · 퀘스트 · 우편 · 친구 · 길드'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('로비 메뉴를 확인한다', async () => {
    await verify('로비 왼쪽에 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」가 위에서 아래 차례로 보인다', await 왼쪽메뉴차례(game), expected.차례);
  });
});
