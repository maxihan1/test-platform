import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 공지띠글바뀔때까지, 공지켜고로비들어가기 } from './helpers/mail-notice.helper.js';
import { QA공지모두지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-411',
  name: '공지가 둘이면 공지 띠가 10초 안팎마다 다음 공지로 넘어간다',
  platforms: ['windows'],
  precondition: ['[QA] 공지 둘이 켜져 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    한도초: z.number().describe('공지 띠가 다음 공지로 넘어가는 한도(초)').default(15),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('[QA] 공지 모두 지우기', () => QA공지모두지우기(admin));

  const 첫째 = '[QA] 첫째 공지';
  const 둘째 = '[QA] 둘째 공지';
  await test.step('[QA] 공지 둘을 켜고 로비 공지 띠에 보이는 것을 확인한다', async () => {
    const 상태 = await 공지켜고로비들어가기(
      game,
      admin,
      아이디,
      비밀번호,
      [
        { 제목: 첫째, 본문: 'QA 공지 본문' },
        { 제목: 둘째, 본문: 'QA 공지 본문' },
      ],
    );
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('로비 공지 띠에 공지가 보인다', 상태.보임, true, { blocker: true });
  });

  await test.step('로비 공지 띠 글이 바뀔 때까지 기다린다', async () => {
    const 처음글 = await game.text(공통HUD.공지띠글주소);
    const 다른제목 = 처음글.includes(첫째) ? 둘째 : 첫째;
    const 시작 = Date.now();
    const 바뀐글 = await 공지띠글바뀔때까지(game, 처음글, 40_000);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 다음공지 = await verify('공지 띠가 다음 공지로 넘어간다', (바뀐글 ?? '').includes(다른제목), true);
    const 시간 = await verify('한도 안에 넘어간다', 걸린초 <= expected.한도초, true);
    await verify('공지가 둘이면 공지 띠가 10초 안팎마다 다음 공지로 넘어간다', 다음공지 && 시간, true);
  });
});
