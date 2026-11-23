import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 로그인화면준비, 설정창닫기 } from './helpers/login-tools.helper.js';
import { 설정창 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-648',
  name: '설정 창에서 화질 버튼을 거듭 누르면 글자가 「Low」 → 「Medium」 → 「High」 → 「Low」 차례로 바뀐다',
  platforms: ['android'],
  precondition: ['로그인 화면에서 설정 창을 열었고 화질 버튼 글자가 「Low」다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver }) => {
  let 처음화질: string | null = null;
  await test.cleanup('화질을 처음 글자로 되돌리기 · 열린 설정 창 닫기', async () => {
    if (처음화질 !== null && (await 지금화면(game)) === '로그인') {
      const 창 = await 설정창.열기(game);
      if (!(await 창.화질맞추기(처음화질))) throw new Error(`화질을 「${처음화질}」로 되돌리지 못했습니다`);
    }
    await 설정창닫기(game);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('설정 창을 열고 화질 버튼 글자를 「Low」로 맞춘다', async () => {
    const 창 = await 설정창.열기(game);
    처음화질 = await 창.화질글();
    await verify('화질 버튼 글자가 「Low」다', await 창.화질맞추기('Low'), true, { blocker: true });
  });
  await test.step('설정 창에서 화질 버튼을 세 번 누른다', async () => {
    const 창 = await 설정창.열기(game);
    const 첫째 = await verify('글자가 「Medium」으로 바뀐다', await 창.화질누르기(), 'Medium');
    const 둘째 = await verify('이어서 「High」로 바뀐다', await 창.화질누르기(), 'High');
    const 셋째 = await verify('다시 「Low」로 돌아온다', await 창.화질누르기(), 'Low');
    await verify('설정 창에서 화질 버튼을 거듭 누르면 글자가 「Low」 → 「Medium」 → 「High」 → 「Low」 차례로 바뀐다', 첫째 && 둘째 && 셋째, true);
  });
});
