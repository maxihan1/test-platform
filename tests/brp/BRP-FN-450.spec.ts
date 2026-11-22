import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글숫자들, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM퀘스트완료 } from './helpers/gm.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-450',
  name: '일일 퀘스트 창 세 줄의 목표와 보상 글을 읽으면 퀘스트 세 줄의 목표 · 보상이 「임프 30마리 처치」 30 · 골드 150 · 경험치 200, 「던전 보스 처치」 1 · 골드 300 · 경험치 400, 「상점에서 물건 구매」 1 · 골드 50 · 경험치 50 이다',
  platforms: ['windows'],
  precondition: ['일반 회원이 /gm quest done 으로 오늘 퀘스트 목표를 채웠다'],
  elements: ['quest:임프 30마리 처치', 'quest:던전 보스 처치', 'quest:상점에서 물건 구매'],
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

  await test.step('오늘 퀘스트 목표를 채운 것을 확인한다', async () => {
    await 퀘스트처음으로(game);
    await GM퀘스트완료(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「상점에서 물건 구매」 진행이 「1/1」이다', await 퀘스트.진행글('상점에서 물건 구매'), '1/1', { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('일일 퀘스트 창 세 줄의 목표와 보상 글을 읽는다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄들 = await 퀘스트.줄들();
    await 퀘스트.닫기();
    const 읽기 = (이름: string): { 목표: number; 보상: number[] } | null => {
      const 줄 = 줄들.find((칸) => 칸.이름 === 이름);
      return 줄 === undefined ? null : { 목표: Number(줄.진행글.split('/')[1]), 보상: 글숫자들(줄.보상글) };
    };
    const 임프 = await verify.element(
      '임프 30마리 처치의 목표 · 골드 · 경험치가 기획서와 같다',
      'quest:임프 30마리 처치',
      읽기('임프 30마리 처치'),
      { 목표: 30, 보상: [150, 200] },
    );
    const 보스 = await verify.element(
      '던전 보스 처치의 목표 · 골드 · 경험치가 기획서와 같다',
      'quest:던전 보스 처치',
      읽기('던전 보스 처치'),
      { 목표: 1, 보상: [300, 400] },
    );
    const 구매 = await verify.element(
      '상점에서 물건 구매의 목표 · 골드 · 경험치가 기획서와 같다',
      'quest:상점에서 물건 구매',
      읽기('상점에서 물건 구매'),
      { 목표: 1, 보상: [50, 50] },
    );
    await verify('일일 퀘스트 창 세 줄의 목표와 보상 글을 읽으면 퀘스트 세 줄의 목표 · 보상이 「임프 30마리 처치」 30 · 골드 150 · 경험치 200, 「던전 보스 처치」 1 · 골드 300 · 경험치 400, 「상점에서 물건 구매」 1 · 골드 50 · 경험치 50 이다', 임프 && 보스 && 구매, true);
  });
});
