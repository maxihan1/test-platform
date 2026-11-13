import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-454',
  name: '같은 계정이 이미 접속해 있으면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」를 띄워 거절한다',
  platforms: ['android'],
  precondition: ['같은 계정이 다른 디바이스에서 접속해 있다'],
  params: null,
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game }) => {
  await test.step('같은 계정으로 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('같은 계정이 이미 접속해 있으면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」를 띄워 거절한다', await 뜨는지(game, 화면글자('접속 실패')), true);
  });
});
