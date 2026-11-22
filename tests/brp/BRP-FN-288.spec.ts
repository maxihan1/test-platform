import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글읽기, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-288',
  name: '상점에서 「조약돌」을 사 구매 퀘스트 목표를 채우면 목표를 채우는 순간 「퀘스트 완료:」와 「퀘스트 창에서 보상을 받으세요」가 든 알림이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 오늘 일일 퀘스트를 처음으로 돌려 두었다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('오늘 일일 퀘스트를 처음으로 돌려 둔 것을 확인한다', async () => {
    const 글 = await 퀘스트처음으로(game);
    await verify('퀘스트 진행이 모두 0 에서 시작한다', 글.split(' · ').every((칸) => 칸.startsWith('0/')), true, { blocker: true });
  });

  await test.step('상점에서 「조약돌」을 사 구매 퀘스트 목표를 채운다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('조약돌');
    const 글 = await 알림글읽기(game, '퀘스트 완료:');
    await 상점.닫기();
    const 완료 = await verify('알림에 「퀘스트 완료:」가 들어 있다', 글 !== null, true);
    const 안내 = await verify('알림에 「퀘스트 창에서 보상을 받으세요」가 들어 있다', 글 !== null && 글.includes('퀘스트 창에서 보상을 받으세요'), true);
    await verify('상점에서 「조약돌」을 사 구매 퀘스트 목표를 채우면 목표를 채우는 순간 「퀘스트 완료:」와 「퀘스트 창에서 보상을 받으세요」가 든 알림이 뜬다', 완료 && 안내, true);
  });
});
