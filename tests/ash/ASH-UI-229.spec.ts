import { defineCase, test, verify } from '@platform/kit';

import { 서버맞추기 } from './helpers/game-enter.helper.js';
import { 안내띠 } from './components/toast.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 서버설정창 } from './pages/server-settings.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-229',
  name: '로그인 화면에서 「서버 설정」을 누르면 서버 주소 창이 뜬다',
  platforms: ['android'],
  precondition: ['게임 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('게임 로그인 화면을 연다', async () => {
    await 서버맞추기(game);
    const 화면 = await 로그인화면.열기(game);
    await verify('로그인 화면에 서버 주소 글이 보인다', (await 화면.서버글()).startsWith('서버:'), true, { blocker: true });
    const 배치 = await game.layout('/Boot/BootCanvas/LoginView');
    await verify('로그인 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
  await test.step('로그인 화면에서 「서버 설정」을 누른다', async () => {
    await new 로그인화면(game).서버설정누르기();
    await game.waitFor(서버설정창.창);
    await verify('로그인 화면에서 「서버 설정」을 누르면 서버 주소 창이 뜬다', await new 서버설정창(game).떠있나(), true);
  });
  await test.step('서버 주소 창에서 「저장」을 누른다', async () => {
    await new 서버설정창(game).저장누르기();
    await new 안내띠(game).뜰때까지('서버 주소를 저장했습니다.');
    await verify('로그인 화면에서 「저장」을 누르면 「서버 주소를 저장했습니다.」 안내가 뜬다', await new 안내띠(game).읽기(), '서버 주소를 저장했습니다.');
  });
  await test.step('서버 주소 창에서 「닫기」를 누른다', async () => {
    const 창 = await 서버설정창.열기(game);
    await 창.닫기누르기();
    await 창.닫힐때까지();
    await verify('로그인 화면에서 「닫기」를 누르면 서버 주소 창이 닫힌다', await 창.떠있나(), false);
  });
  await test.step('로그인 화면에서 「로그인」 버튼을 확인한다', async () => {
    await verify('로그인 화면에 「로그인」 버튼이 보이고 누를 수 있다', (await new 로그인화면(game).로그인버튼())?.interactable, true);
  });
  await test.step('로그인 화면에서 「회원가입」 버튼을 확인한다', async () => {
    await verify('로그인 화면에 「회원가입」 버튼이 보이고 누를 수 있다', (await new 로그인화면(game).가입버튼())?.interactable, true);
  });
});
