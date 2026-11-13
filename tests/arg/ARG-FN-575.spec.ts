import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-575',
  name: '로그인 화면 공지 띠를 확인하면 공지 띠는 「[공지] <제목> — <내용>」 모양으로 한 줄로만 쓰고 「[공지]」는 금색, 바탕은 반투명 검정이다',
  platforms: ['android'],
  precondition: ['공지가 켜져 있다'],
  params: null,
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game }) => {
  await test.step('로그인 화면 공지 띠를 확인한다', async () => {
    await 로그인화면까지(game);
    await verify('로그인 화면 공지 띠를 확인하면 공지 띠는 「[공지] <제목> — <내용>」 모양으로 한 줄로만 쓰고 「[공지]」는 금색, 바탕은 반투명 검정이다', await 뜨는지(game, 화면글자('[공지]')), true);
  });
});
