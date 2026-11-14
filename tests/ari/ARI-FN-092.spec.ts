import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  고유캐릭터이름,
  길드들지우기,
  길드만들고번호,
  길드목록,
  길드저장데이터,
  새아이템번호,
  서버토큰,
  시험계정번호,
  아이템만들기,
  아이템모두지우기,
  우편들지우기,
  우편만들고번호,
  우편목록,
  우편저장데이터,
  같은아이템번호행들,
  캐릭터들지우기,
  캐릭터만들고번호,
  캐릭터지우기,
} from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-092',
  name: '우편을 받은 캐릭터를 삭제하면 그 캐릭터의 우편은 그대로 남는다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    삭제응답코드: z.number().describe('캐릭터 삭제 응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 캐릭터들: number[] = [];
  const 우편들: number[] = [];
  const 아이템들: number[] = [];
  const 길드들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('우편을 받은 캐릭터를 삭제한 뒤 그 캐릭터 번호로 POST /api/getmailmessages 를 부른다', async () => {
      const 캐릭터번호 = await 캐릭터만들고번호(request, 토큰, 시험계정번호(), 고유캐릭터이름('fn092m'));
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      const 우편번호 = 캐릭터번호 > 0 ? await 우편만들고번호(request, 토큰, 캐릭터번호, 우편저장데이터('qa_tmp_fn092')) : 0;
      if (우편번호 > 0) 우편들.push(우편번호);
      await verify('우편을 받을 캐릭터와 우편을 만들었다', 캐릭터번호 > 0 && 우편번호 > 0, true, { blocker: true });
      const 삭제 = await 캐릭터지우기(request, 토큰, 캐릭터번호);
      if (삭제.ok()) 캐릭터들.splice(캐릭터들.indexOf(캐릭터번호), 1);
      await verify('우편을 받은 캐릭터를 삭제한 응답 코드가 기대 결과와 같다', 삭제.status(), expected.삭제응답코드, { blocker: true });
      await verify('우편을 받은 캐릭터를 삭제하면 그 캐릭터의 우편은 그대로 남는다', (await 우편목록(request, 토큰, 캐릭터번호)).some((m) => m.id === 우편번호), true);
    });
    await test.step('아이템 인스턴스를 가진 캐릭터를 삭제한 뒤 POST /api/getiteminstances 를 부른다', async () => {
      const 캐릭터번호 = await 캐릭터만들고번호(request, 토큰, 시험계정번호(), 고유캐릭터이름('fn092i'));
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      const 아이템번호 = 새아이템번호();
      아이템들.push(아이템번호);
      const 만듦 = await 아이템만들기(request, 토큰, 아이템번호, JSON.stringify({ ItemName: 'qa_tmp_fn092', OwnerCharacterId: 캐릭터번호 }));
      await verify('아이템 인스턴스를 가진 캐릭터를 만들었다', 캐릭터번호 > 0 && 만듦.ok(), true, { blocker: true });
      const 삭제 = await 캐릭터지우기(request, 토큰, 캐릭터번호);
      if (삭제.ok()) 캐릭터들.splice(캐릭터들.indexOf(캐릭터번호), 1);
      await verify('아이템 인스턴스를 가진 캐릭터를 삭제한 응답 코드가 기대 결과와 같다', 삭제.status(), expected.삭제응답코드, { blocker: true });
      await verify('삭제한 캐릭터의 아이템 인스턴스가 목록에 남아 있다', (await 같은아이템번호행들(request, 토큰, 아이템번호)).length > 0, true);
    });
    await test.step('길드에 든 캐릭터를 삭제한 뒤 POST /api/getguilds 를 부른다', async () => {
      const 캐릭터번호 = await 캐릭터만들고번호(request, 토큰, 시험계정번호(), 고유캐릭터이름('fn092g'));
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      const 길드번호 = await 길드만들고번호(request, 토큰, 길드저장데이터('qa_tmp_fn092', [캐릭터번호]));
      if (길드번호 > 0) 길드들.push(길드번호);
      await verify('길드에 든 캐릭터를 만들었다', 캐릭터번호 > 0 && 길드번호 > 0, true, { blocker: true });
      const 삭제 = await 캐릭터지우기(request, 토큰, 캐릭터번호);
      if (삭제.ok()) 캐릭터들.splice(캐릭터들.indexOf(캐릭터번호), 1);
      await verify('길드에 든 캐릭터를 삭제한 응답 코드가 기대 결과와 같다', 삭제.status(), expected.삭제응답코드, { blocker: true });
      const 길드 = (await 길드목록(request, 토큰)).find((g) => g.id === 길드번호);
      await verify('삭제한 캐릭터가 길드 저장 데이터의 멤버로 남아 있다', (길드?.saveData ?? '').includes(`"CharacterId":${캐릭터번호}`), true);
    });
  } finally {
    await 우편들지우기(request, 토큰, 우편들);
    for (const 번호 of 아이템들) await 아이템모두지우기(request, 토큰, 번호);
    await 길드들지우기(request, 토큰, 길드들);
    await 캐릭터들지우기(request, 토큰, 캐릭터들);
  }
});
