import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 글자, 제재걸기, 제재풀기 } from './helpers/api.helper.js';
import { 채팅금지걸기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-181',
  name: '사유 0자로 제재를 걸면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    짧은글자수: z.number().int().min(0).describe('빈 사유 글자 수 — 0').default(0),
    하한글자수: z.number().int().describe('사유 글자 수 — 1 이상 200 이하 정수').default(1),
    상한글자수: z.number().int().describe('사유 글자 수 — 1 이상 200 이하 정수').default(200),
    넘는글자수: z.number().int().describe('사유 글자 수 — 201 이상 정수').default(201),
  }),
  expected: z.object({
    거부코드: z.number().describe('거부 응답 코드').default(400),
    걸림코드: z.number().describe('제재가 걸린 응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾고 남은 CHAT_MUTE 를 푼다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
  });
  await test.step('사유 0자로 「두 번째 플레이어」에 제재를 건다', async () => {
    const 응답 = await 제재걸기(admin, 계정번호, { type: 'CHAT_MUTE', reason: 글자(params.짧은글자수) });
    try {
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('사유 0자 제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.거부코드);
      const 종류 = await verify('사유 0자 제재 응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      await verify('사유 0자로 제재를 걸면 400 INVALID 다', 코드 && 종류, true);
    } finally {
      if (응답.ok()) await 제재풀기(admin, ((await 응답.json().catch(() => ({}))) as { id?: number }).id ?? 0, '[QA] 시험 정리');
    }
  });
  await test.step('사유 1자로 「두 번째 플레이어」에 제재를 건다', async () => {
    try {
      const 응답 = await 채팅금지걸기(admin, 계정번호, { reason: 글자(params.하한글자수) });
      const 코드 = await verify('사유 1자 제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.걸림코드);
      await verify('제재 사유 1자일 때 200 으로 제재가 걸린다', 코드, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
  await test.step('사유 200자로 「두 번째 플레이어」에 제재를 건다', async () => {
    try {
      const 응답 = await 채팅금지걸기(admin, 계정번호, { reason: 글자(params.상한글자수) });
      const 코드 = await verify('사유 200자 제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.걸림코드);
      await verify('제재 사유 200자일 때 200 으로 제재가 걸린다', 코드, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
  await test.step('사유 201자로 「두 번째 플레이어」에 제재를 건다', async () => {
    const 응답 = await 제재걸기(admin, 계정번호, { type: 'CHAT_MUTE', reason: 글자(params.넘는글자수) });
    try {
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('사유 201자 제재 응답 코드가 기대 결과와 같다', 응답.status(), expected.거부코드);
      const 종류 = await verify('사유 201자 제재 응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      await verify('제재 사유 201자일 때 400 INVALID 다', 코드 && 종류, true);
    } finally {
      if (응답.ok()) await 제재풀기(admin, ((await 응답.json().catch(() => ({}))) as { id?: number }).id ?? 0, '[QA] 시험 정리');
    }
  });
});
