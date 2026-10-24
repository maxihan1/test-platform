import { defineCase, test, verify } from '@platform/kit';

import { type 봇, type 캐릭터 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 보라봇만들기, 봇목록, 빨간봇만들기, 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 색이름 } from './helpers/world.helper.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-106',
  name: '선량한 봇 이름표가 파란색으로 보인다',
  platforms: ['android'],
  precondition: [
    '새 전사 캐릭터로 게임에 들어와 초록 들판에 있다',
    '새 전사 캐릭터로 게임에 들어와 초록 들판에 있고 보라 이름 봇이 있다',
    '새 전사 캐릭터로 게임에 들어와 초록 들판에 있고 빨간 이름 봇이 있다',
  ],
  elements: ['state:성향=보라', 'state:성향=선량', 'state:성향=악명'],
  params: null,
  expected: null,
});

async function 색될때까지(월드: 월드화면, 주소: string, 색: string): Promise<string> {
  const 끝 = Date.now() + 30_000;
  let 지금 = '이름표 안 보임';
  for (;;) {
    if (await 월드.있나(주소)) 지금 = 색이름(await 월드.이름표색(주소));
    if (지금 === 색 || Date.now() >= 끝) return 지금;
    await new Promise((깨운다) => setTimeout(깨운다, 500));
  }
}

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 맞는이: 캐릭터 | undefined;
  let 후보: 봇[] = [];
  let 첫봇: 봇 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판으로 보내고 봇을 맞을 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qaui106');
      맞는이 = await 새캐릭터(admin, 'qaui106');
      await 순간이동(admin, 누구, 'Beginner');
      await 살아있는봇(admin, 누구, 'Beginner', 'Innocent');
      후보 = (await 봇목록(admin, 누구, 'Beginner')).filter((b) => !b.isDead && b.alignment.state === 'Innocent');
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「초록 들판」이 보인다', await 월드.구역글(), '초록 들판', { blocker: true });
    });
    await test.step('선량한 봇 이름표 색을 읽는다', async () => {
      const 월드 = new 월드화면(game);
      첫봇 = await 월드.보이는봇(후보, 60_000);
      await verify('선량한 봇 이름표가 파란색으로 보인다', await 색될때까지(월드, 월드.봇이름표(첫봇.id, 첫봇.name), '파란색'), '파란색');
    });
    await test.step('보라 이름 봇 이름표 색을 읽는다', async () => {
      const 월드 = new 월드화면(game);
      const 보라 = await 보라봇만들기(admin, 맞는이!, 첫봇!);
      await verify('그 봇이 선공 표시 상태가 됐다', 보라.alignment.state, 'Purple', { blocker: true });
      await verify('선공 표시 봇 이름표가 보라색으로 보인다', await 색될때까지(월드, 월드.봇이름표(첫봇!.id, 첫봇!.name), '보라색'), '보라색');
    });
    await test.step('빨간 이름 봇 이름표 색을 읽는다', async () => {
      const 월드 = new 월드화면(game);
      const 둘째 = 첫봇!;
      const 빨강 = await 빨간봇만들기(admin, 맞는이!, 둘째);
      await verify('그 봇이 악명 상태가 됐다', 빨강.alignment.state, 'Chaotic', { blocker: true });
      await verify('악명 봇 이름표가 빨간색으로 보인다', await 색될때까지(월드, 월드.봇이름표(둘째.id, 둘째.name), '빨간색'), '빨간색');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    if (맞는이 !== undefined) await 캐릭터지우기(admin, 맞는이);
  }
});
