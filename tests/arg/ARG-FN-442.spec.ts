import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-442',
  name: '서버 인원이 이미 8명이면 바로 거절하고 「접속 실패」 창에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」를 띄운다',
  platforms: ['android'],
  precondition: ['서버에 8명이 접속해 있다'],
  params: null,
  expected: null,
  held: '보류 — 두 번째 접속자를 만드는 길 없음(디바이스 한 대에 다른 접속 도우미가 없다)',
});

test(spec, async ({ game }) => {
  await test.step('아홉 번째 계정으로 「게임 시작」을 누른다', async () => {
    await 로그인화면까지(game);
    await verify('서버 인원이 이미 8명이면 바로 거절하고 「접속 실패」 창에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」를 띄운다', await 뜨는지(game, 화면글자('접속 실패')), true);
  });
});
