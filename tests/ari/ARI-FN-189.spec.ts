import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린제재모두풀기, 계정번호찾기, 고유이름, 글자, 제재풀기 } from './helpers/api.helper.js';
import { 채팅금지걸기 } from './helpers/sanction.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-189',
  name: '해제 사유 0자로 제재를 풀면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    짧은글자수: z.number().int().min(0).describe('빈 해제 사유 글자 수 — 0').default(0),
    하한글자수: z.number().int().describe('해제 사유 글자 수 — 1 이상 200 이하 정수').default(1),
    상한글자수: z.number().int().describe('해제 사유 글자 수 — 1 이상 200 이하 정수').default(200),
    넘는글자수: z.number().int().describe('해제 사유 글자 수 — 201 이상 정수').default(201),
  }),
  expected: z.object({
    거부코드: z.number().describe('거부 응답 코드').default(400),
    풀림코드: z.number().describe('제재가 풀린 응답 코드').default(200),
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
  await test.step('해제 사유 0자로 제재를 푼다', async () => {
    try {
      const 걸기 = await 채팅금지걸기(admin, 계정번호, { reason: 고유이름('ARI-FN-189 해제 0자') });
      await verify('해제 사유 0자 시험용 CHAT_MUTE 가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 제재번호 = ((await 걸기.json().catch(() => ({}))) as { id?: number }).id ?? 0;
      const 응답 = await 제재풀기(admin, 제재번호, 글자(params.짧은글자수));
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('해제 사유 0자 응답 코드가 기대 결과와 같다', 응답.status(), expected.거부코드);
      const 종류 = await verify('해제 사유 0자 응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      await verify('해제 사유 0자로 제재를 풀면 400 INVALID 다', 코드 && 종류, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
  await test.step('해제 사유 1자로 제재를 푼다', async () => {
    try {
      const 걸기 = await 채팅금지걸기(admin, 계정번호, { reason: 고유이름('ARI-FN-189 해제 1자') });
      await verify('해제 사유 1자 시험용 CHAT_MUTE 가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 제재번호 = ((await 걸기.json().catch(() => ({}))) as { id?: number }).id ?? 0;
      const 응답 = await 제재풀기(admin, 제재번호, 글자(params.하한글자수));
      const 몸 = (await 응답.json().catch(() => ({}))) as { releasedAt?: string | null };
      const 코드 = await verify('해제 사유 1자 응답 코드가 기대 결과와 같다', 응답.status(), expected.풀림코드);
      const 풀림 = await verify('해제 사유 1자 응답 releasedAt 이 채워져 있다', (몸.releasedAt ?? null) !== null, true);
      await verify('해제 사유 1자일 때 200 으로 제재가 풀린다', 코드 && 풀림, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
  await test.step('해제 사유 200자로 제재를 푼다', async () => {
    try {
      const 걸기 = await 채팅금지걸기(admin, 계정번호, { reason: 고유이름('ARI-FN-189 해제 200자') });
      await verify('해제 사유 200자 시험용 CHAT_MUTE 가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 제재번호 = ((await 걸기.json().catch(() => ({}))) as { id?: number }).id ?? 0;
      const 응답 = await 제재풀기(admin, 제재번호, 글자(params.상한글자수));
      const 몸 = (await 응답.json().catch(() => ({}))) as { releasedAt?: string | null };
      const 코드 = await verify('해제 사유 200자 응답 코드가 기대 결과와 같다', 응답.status(), expected.풀림코드);
      const 풀림 = await verify('해제 사유 200자 응답 releasedAt 이 채워져 있다', (몸.releasedAt ?? null) !== null, true);
      await verify('해제 사유 200자일 때 200 으로 제재가 풀린다', 코드 && 풀림, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
  await test.step('해제 사유 201자로 제재를 푼다', async () => {
    try {
      const 걸기 = await 채팅금지걸기(admin, 계정번호, { reason: 고유이름('ARI-FN-189 해제 201자') });
      await verify('해제 사유 201자 시험용 CHAT_MUTE 가 걸렸다', 걸기.status(), 200, { blocker: true });
      const 제재번호 = ((await 걸기.json().catch(() => ({}))) as { id?: number }).id ?? 0;
      const 응답 = await 제재풀기(admin, 제재번호, 글자(params.넘는글자수));
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string };
      const 코드 = await verify('해제 사유 201자 응답 코드가 기대 결과와 같다', 응답.status(), expected.거부코드);
      const 종류 = await verify('해제 사유 201자 응답 code 가 INVALID 다', 몸.code ?? '', 'INVALID');
      await verify('해제 사유 201자일 때 400 INVALID 다', 코드 && 종류, true);
    } finally {
      await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    }
  });
});
