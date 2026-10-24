import { defineCase, test, verify } from '@platform/kit';

import { 머리, type 바닥아이템, 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정비우기, 바닥아이템남기기, 봇목록, 월드초기화, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-568',
  name: '월드를 초기화하면 바닥 아이템이 지워지고 봇 수가 돌아온다',
  platforms: ['android'],
  precondition: ['캐릭터가 초록 들판에서 죽어 바닥 아이템을 남겼다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 떨군: 캐릭터 | undefined;
  let 바닥번호: number | undefined;
  try {
    await test.step('이전 실행이 남긴 고정 결과를 비운다', async () => {
      await 결과고정비우기(admin);
    });
    await test.step('캐릭터가 초록 들판에서 죽어 바닥 아이템을 남긴다', async () => {
      const 남긴 = await 바닥아이템남기기(admin, 'qafn568');
      떨군 = 남긴.떨군;
      바닥번호 = 남긴.아이템.id;
    });
    await test.step('남긴 바닥 아이템을 확인한다', async () => {
      const 목록 = await 본문<바닥아이템[]>(await request.get('/world/ground-items?zone=Beginner', { headers: 머리(떨군!) }), '바닥 아이템 목록');
      await verify('캐릭터가 초록 들판에 바닥 아이템을 남겼다', 목록.some((i) => i.id === 바닥번호), true, { blocker: true });
    });
    await test.step('어드민으로 초록 들판 월드를 초기화한다', async () => {
      const 나 = 떨군!;
      const 응답 = await 월드초기화(admin, 'Beginner');
      const 목록 = await 본문<바닥아이템[]>(await request.get('/world/ground-items?zone=Beginner', { headers: 머리(나) }), '바닥 아이템 목록');
      const 지워짐 = await verify('초록 들판 바닥 아이템이 한 건도 없다', 목록.length, 0);
      const 봇수 = await verify('초기화가 돌려준 봇 수가 초록 들판 봇 수와 같다', 응답.botCount, (await 봇목록(admin, 나, 'Beginner')).length);
      await verify('월드를 초기화하면 바닥 아이템이 지워지고 봇 수가 돌아온다', 지워짐 && 봇수, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (떨군 !== undefined) await 캐릭터지우기(admin, 떨군);
  }
});
