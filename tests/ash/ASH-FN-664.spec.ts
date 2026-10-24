import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 목록에서사라질때까지, 바닥아이템찾기, 죽음보고 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-664',
  name: '사망 드랍 아이템은 180초가 지나면 바닥 아이템 목록에서 사라진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 사망 드랍이 나오도록 고정돼 있다'],
  held: '보류 — 180초를 케이스 한도(120초) 안에 기다릴 수 없음',
  techniques: ['상태 전이'],
  elements: ['zone:Beginner', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 남긴: { id: number } | undefined;
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      const 나 = await 새캐릭터(admin, 'qafn664');
      누구 = 나;
      await 순간이동(admin, 나, 'Beginner');
      await 결과고정(admin, { deathDrop: [true] });
    });
    await test.step('캐릭터가 초록 들판에 있고 사망 드랍이 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('사망 드랍이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.deathDrop[0], true, { blocker: true });
    });
    await test.step('몬스터에게 죽어 사망 드랍을 남긴다', async () => {
      const 죽음 = await 죽음보고(request, 누구!);
      남긴 = 죽음.dropped ?? undefined;
    });
    await test.step('죽은 자리 바닥에 사망 드랍이 남아 있는지 확인한다', async () => {
      await verify('사망 드랍이 바닥 아이템 목록에 있다', (await 바닥아이템찾기(request, 누구!, 'Beginner', 남긴?.id ?? -1)) !== undefined, true, { blocker: true });
    });
    await test.step('180초가 지난 뒤 바닥 아이템 목록을 받는다', async () => {
      await 목록에서사라질때까지(request, 누구!, 'Beginner', 남긴!.id, 200_000);
      await verify('사망 드랍 아이템은 180초가 지나면 바닥 아이템 목록에서 사라진다', (await 바닥아이템찾기(request, 누구!, 'Beginner', 남긴!.id)) === undefined, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
