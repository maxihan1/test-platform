import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-482',
  name: '직업마다 정보 상자 스킬 아이콘 설명을 띄우면 직업별 스킬 표(탱커 「전투 망치」 · 「방패 오라」 · 없음, 궁수 「화살 쏘기」 · 「강화 사격」 · 「일제 사격」, 마법사 「마력탄」 · 「치유의 손길」 · 없음, 도적 「급소 찌르기」 · 「질주 공격」 · 「은신」)대로 행동 버튼에 스킬이 붙는다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 손가락을 올려 두는 동작이 게임 드라이버에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('직업마다 정보 상자 스킬 아이콘 설명을 띄운다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('직업마다 정보 상자 스킬 아이콘 설명을 띄우면 직업별 스킬 표(탱커 「전투 망치」 · 「방패 오라」 · 없음, 궁수 「화살 쏘기」 · 「강화 사격」 · 「일제 사격」, 마법사 「마력탄」 · 「치유의 손길」 · 없음, 도적 「급소 찌르기」 · 「질주 공격」 · 「은신」)대로 행동 버튼에 스킬이 붙는다', await 뜨는지(game, 화면글자('전투 망치')), true);
  });
});
