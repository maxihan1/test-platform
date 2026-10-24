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

const 안보임 = '이름표 안 보임';

async function 지금색(월드: 월드화면, 주소: string): Promise<string> {
  if (!(await 월드.있나(주소))) return 안보임;
  try {
    return 색이름(await 월드.이름표색(주소));
  } catch (e) {
    if (await 월드.있나(주소)) throw e;
    return 안보임;
  }
}

async function 색될때까지(월드: 월드화면, 주소: string, 색: string): Promise<string> {
  const 끝 = Date.now() + 30_000;
  let 사라진때: number | undefined;
  for (;;) {
    const 지금 = await 지금색(월드, 주소);
    사라진때 = 지금 === 안보임 ? (사라진때 ?? Date.now()) : undefined;
    if (지금 === 색 || Date.now() >= 끝 || (사라진때 !== undefined && Date.now() - 사라진때 >= 3_000)) return 지금;
    await new Promise((깨운다) => setTimeout(깨운다, 500));
  }
}

async function 보이는봇색(
  월드: 월드화면,
  후보: 봇[],
  바꾸기: (봇값: 봇) => Promise<봇>,
  상태: 봇['alignment']['state'],
  색: string,
): Promise<{ 바뀐: 봇; 색: string }> {
  let 남은 = 후보;
  for (let 번 = 1; ; 번 += 1) {
    const 고른 = await 월드.보이는봇(남은, 60_000);
    const 바뀐 = await 바꾸기(고른);
    if (바뀐.alignment.state !== 상태) return { 바뀐, 색: 안보임 };
    const 읽은 = await 색될때까지(월드, 월드.봇이름표(고른.id, 고른.name), 색);
    const 다음 = 남은.filter((b) => b.id !== 고른.id);
    if (읽은 !== 안보임 || 번 === 3 || 다음.length === 0) return { 바뀐, 색: 읽은 };
    남은 = 다음;
  }
}

test(spec, async ({ game, admin }) => {
  let 누구: 캐릭터 | undefined;
  let 맞는이: 캐릭터 | undefined;
  let 후보: 봇[] = [];
  let 보라봇: 봇 | undefined;
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
      const { 색 } = await 보이는봇색(new 월드화면(game), 후보, async (봇값) => 봇값, 'Innocent', '파란색');
      await verify('선량한 봇 이름표가 파란색으로 보인다', 색, '파란색');
    });
    await test.step('보라 이름 봇 이름표 색을 읽는다', async () => {
      const { 바뀐, 색 } = await 보이는봇색(new 월드화면(game), 후보, (봇값) => 보라봇만들기(admin, 맞는이!, 봇값), 'Purple', '보라색');
      보라봇 = 바뀐;
      await verify('그 봇이 선공 표시 상태가 됐다', 바뀐.alignment.state, 'Purple', { blocker: true });
      await verify('선공 표시 봇 이름표가 보라색으로 보인다', 색, '보라색');
    });
    await test.step('빨간 이름 봇 이름표 색을 읽는다', async () => {
      const 먼저 = [보라봇!, ...후보.filter((b) => b.id !== 보라봇!.id)];
      const { 바뀐, 색 } = await 보이는봇색(new 월드화면(game), 먼저, (봇값) => 빨간봇만들기(admin, 맞는이!, 봇값), 'Chaotic', '빨간색');
      await verify('그 봇이 악명 상태가 됐다', 바뀐.alignment.state, 'Chaotic', { blocker: true });
      await verify('악명 봇 이름표가 빨간색으로 보인다', 색, '빨간색');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    if (맞는이 !== undefined) await 캐릭터지우기(admin, 맞는이);
  }
});
