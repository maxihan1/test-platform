import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 데이터표줄찾기, 표읽기 } from './helpers/dungeon.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-006',
  name: '/gm data skill 로 직업마다 기본 체력을 읽으면 직업별 기본 체력이 탱커 1,200 · 궁수 900 · 마법사 800 · 도적 1,000 이다',
  platforms: ['windows'],
  precondition: ['직업 표(기본 체력)를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['class:탱커', 'class:궁수', 'class:마법사', 'class:도적'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm data skill 로 직업마다 기본 체력을 읽는다', async () => {
    const 표 = await 표읽기(game, 'skill');
    await verify('직업 표 줄을 읽는다', Object.keys(표).length > 0, true, { blocker: true });
    const 탱커 = await verify.element('탱커 기본 체력이 기획서와 같다', 'class:탱커', { 기본체력: 데이터표줄찾기(표, '탱커').체력 }, { 기본체력: 1200 });
    const 궁수 = await verify.element('궁수 기본 체력이 기획서와 같다', 'class:궁수', { 기본체력: 데이터표줄찾기(표, '궁수').체력 }, { 기본체력: 900 });
    const 마법사 = await verify.element('마법사 기본 체력이 기획서와 같다', 'class:마법사', { 기본체력: 데이터표줄찾기(표, '마법사').체력 }, { 기본체력: 800 });
    const 도적 = await verify.element('도적 기본 체력이 기획서와 같다', 'class:도적', { 기본체력: 데이터표줄찾기(표, '도적').체력 }, { 기본체력: 1000 });
    await verify('/gm data skill 로 직업마다 기본 체력을 읽으면 직업별 기본 체력이 탱커 1,200 · 궁수 900 · 마법사 800 · 도적 1,000 이다', 탱커 && 궁수 && 마법사 && 도적, true);
  });
});
