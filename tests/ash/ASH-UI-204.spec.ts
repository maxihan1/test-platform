import { defineCase, test, verify } from '@platform/kit';

import { 안내띠 } from './components/toast.component.js';
import { 로그인창 } from './pages/login.page.js';
import { 서버설정창 } from './pages/server-settings.page.js';

export const spec = defineCase({
  tcId: 'ASH-UI-204',
  name: '로그인 화면 버튼 반응',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  let 로그인: 로그인창 | undefined;
  let 설정: 서버설정창 | undefined;

  await test.step('「서버 설정」을 누른다', async () => {
    로그인 = await 로그인창.열기(game);
    const 배치 = await game.layout(로그인창.화면);
    await verify('로그인 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    설정 = await 로그인.서버설정열기();
    await verify('로그인 화면에서 「서버 설정」을 누르면 서버 주소 창이 뜬다', await 설정.보이나(), true);
  });

  await test.step('서버 주소 창에서 「저장」을 누른다', async () => {
    const 창배치 = await game.layout(서버설정창.창);
    await verify('서버 주소 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 창배치.problems, []);
    await 설정!.저장();
    await verify('로그인 화면에서 「저장」을 누르면 「서버 주소를 저장했습니다.」 안내가 뜬다', await new 안내띠(game).뜬글(), '서버 주소를 저장했습니다.');
  });

  await test.step('서버 주소 창에서 「닫기」를 누른다', async () => {
    설정 = (await 설정!.보이나()) ? 설정! : await 로그인!.서버설정열기();
    await 설정.닫기();
    await verify('로그인 화면에서 「닫기」를 누르면 서버 주소 창이 닫힌다', await 설정.보이나(), false);
  });

  await test.step('「로그인」 버튼을 확인한다', async () => {
    await verify('로그인 화면에서 「로그인」 버튼이 보이고 누를 수 있다', await 로그인!.누를수있나(로그인창.로그인버튼), true);
  });

  await test.step('「회원가입」 버튼을 확인한다', async () => {
    await verify('로그인 화면에서 「회원가입」 버튼이 보이고 누를 수 있다', await 로그인!.누를수있나(로그인창.회원가입버튼), true);
  });
});
