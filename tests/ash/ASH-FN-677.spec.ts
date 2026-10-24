import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 본문, 새계정, 인증머리 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 새캐릭터창 } from './pages/character-create.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-677',
  name: '새 캐릭터 만들기 창에서 이름에 공백만 넣고 「만들기」를 누르면 빈 이름처럼 막혀 캐릭터가 생기지 않는다',
  platforms: ['android'],
  precondition: ['새 계정으로 로그인해 새 캐릭터 만들기 창을 열었다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, request }) => {
  let 누구: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      누구 = await 새계정(admin, 'qafn677');
    });
    await test.step('새 계정으로 로그인해 새 캐릭터 만들기 창을 연다', async () => {
      await 로그인하기(game, 누구!);
      const 창 = await 새캐릭터창.열기(game, 0);
      await verify('새 캐릭터 만들기 창이 보인다', await 창.떠있나(), true, { blocker: true });
    });
    await test.step('새 캐릭터 만들기 창에서 이름에 공백만 넣고 「만들기」를 누른다', async () => {
      const 창 = new 새캐릭터창(game);
      await 창.이름적기('   ');
      await 창.만들기누르기();
      await game.waitFor(`${새캐릭터창.창}/Window/StatusText`, { text: '이름은' });
      const 막힘 = await verify('빈 이름과 같은 안내가 보인다', await 창.상태글(), '이름은 2~12자의 한글, 영문, 숫자만 쓸 수 있습니다.');
      const 목록 = await 본문<unknown[]>(await request.get('/characters', { headers: 인증머리(누구!) }), '캐릭터 목록');
      const 없음 = await verify('캐릭터 목록이 비어 있다', 목록.length, 0);
      await verify('새 캐릭터 만들기 창에서 이름에 공백만 넣고 「만들기」를 누르면 빈 이름처럼 막혀 캐릭터가 생기지 않는다', 막힘 && 없음, true);
    });
  } finally {
    if (누구 !== undefined) await 계정지우기(admin, 누구.아이디);
  }
});
