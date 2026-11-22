import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 채팅금지알림기다리기 } from './helpers/screen-check.helper.js';
import { 계정번호, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-429',
  name: '채팅 금지를 걸면 25초 안에 채팅이 막혀 채팅 금지 오류 알림이 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    채팅글: z.string().describe('보낼 채팅 글 — 100자 이하').default('QA 채팅 금지 시험'),
  }),
  expected: z.object({
    한도초: z.number().describe('채팅이 막히는 한도(초)').default(25),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  let 제재번호: number | null = null;
  await test.cleanup('두 번째 플레이어 채팅 금지 풀기', async () => {
    if (제재번호 !== null) await 제재풀기(admin, 제재번호);
  });

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('운영 API 로 채팅 금지를 걸고 채팅이 막힐 때까지 글을 보낸다', async () => {
    const 시작 = Date.now();
    제재번호 = await 제재걸기(admin, await 계정번호(admin, 아이디), 'CHAT_MUTE', '[QA] 채팅 금지 사유');
    const 알림 = await 채팅금지알림기다리기(game, params.채팅글, 45_000);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 막힘 = await verify('채팅 금지 오류 알림에 「채팅이 금지된 계정입니다」가 들어 있다', (알림 ?? '').includes('채팅이 금지된 계정입니다'), true);
    const 시간 = await verify('한도 안에 채팅이 막힌다', 걸린초 <= expected.한도초, true);
    await verify('채팅 금지를 걸면 25초 안에 채팅이 막혀 채팅 금지 오류 알림이 뜬다', 막힘 && 시간, true);
  });
});
