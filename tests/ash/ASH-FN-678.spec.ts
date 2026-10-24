import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 될때까지 } from './helpers/admin.helper.js';
import { 머리, 오류, type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정비우기, 바닥아이템남기기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-678',
  name: '만료된 바닥 아이템을 주우면 409 「ITEM_EXPIRED」다',
  platforms: ['android'],
  precondition: ['만료된 바닥 아이템이 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 바닥 아이템이 만료되기까지 180초를 케이스 한도(120초) 안에 기다릴 수 없음',
  params: z.object({
    기다릴시간: z.number().int().describe('바닥 아이템이 만료될 때까지 기다릴 시간(초)'),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 떨군: 캐릭터 | undefined;
  let 바닥번호: number | undefined;
  let 자리: { x: number; z: number } | undefined;
  let 만료: number | undefined;
  try {
    await test.step('이전 실행이 남긴 고정 결과를 비운다', async () => {
      await 결과고정비우기(admin);
    });
    await test.step('캐릭터가 초록 들판에서 죽어 바닥 아이템을 남긴다', async () => {
      const 남긴 = await 바닥아이템남기기(admin, 'qafn678');
      떨군 = 남긴.떨군;
      바닥번호 = 남긴.아이템.id;
      자리 = { x: 남긴.아이템.x, z: 남긴.아이템.z };
      만료 = Date.parse(남긴.아이템.expiresAt);
    });
    await test.step('바닥 아이템이 만료될 때까지 기다린다', async () => {
      await 될때까지(async () => Date.now() > 만료!, params.기다릴시간 * 1000, '바닥 아이템이 만료되는 일');
    });
    await test.step('만료된 바닥 아이템이 있는지 확인한다', async () => {
      await verify('만료된 바닥 아이템이 있다', Date.now() > 만료!, true, { blocker: true });
    });
    await test.step('만료된 바닥 아이템을 줍는다', async () => {
      const 응답 = await request.post(`/world/ground-items/${String(바닥번호!)}/pickup`, { headers: 머리(떨군!), data: { x: 자리!.x, z: 자리!.z } });
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 사유 = await verify('오류 코드가 「ITEM_EXPIRED」다', (await 오류(응답)).code, 'ITEM_EXPIRED');
      await verify('만료된 바닥 아이템을 주우면 409 「ITEM_EXPIRED」다', 코드 && 사유, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (떨군 !== undefined) await 캐릭터지우기(admin, 떨군);
  }
});
