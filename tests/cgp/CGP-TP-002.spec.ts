import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 기본식물차례 } from './helpers/enter.helper.js';
import {
  고르기창읽기,
  맵선택읽기,
  랭킹창읽기,
  알림창닫기,
  알림창읽기,
  인원수창읽기,
  조작안내읽기,
  창경로,
  첫칸에첫식물넣기,
  칸식물될때까지,
  칸하나비우기,
  읽기,
} from './helpers/screen-read.helper.js';
import { 알림창 } from './pages/alert.page.js';
import { 식물이름들, 캐릭터선택화면 } from './pages/char-select.page.js';
import { 랭킹창 } from './pages/leaderboard.page.js';
import { 메인메뉴화면 } from './pages/main-menu.page.js';
import { 맵선택창 } from './pages/map-select.page.js';
import { 인원수선택창 } from './pages/player-count.page.js';

const 인원수선택 = defineCase({
  tcId: 'CGP-FN-217',
  name: '메인 메뉴에서 「빠른시작」을 누르면 「인원수 선택」 창에 「1P」 · 「2P」 · 「3P」 · 「4P」 버튼이 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['메인 메뉴에 있다'],
  params: null,
  expected: null,
});

const 알림창띄우기 = defineCase({
  tcId: 'CGP-FN-238',
  name: '캐릭터 선택에서 Esc 를 누르면 「알림」 창에 「메인 메뉴로 돌아가시겠습니까?」와 「취소」 · 「확인」 버튼이 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['캐릭터 선택에서 고양이를 고르기 전이다'],
  params: null,
  expected: null,
});

const 고양이고르기 = defineCase({
  tcId: 'CGP-FN-223',
  name: '캐릭터 선택에서 고양이를 Enter 로 고르면 「식물을 선택해 주세요.」 안내와 식물 칸 셋이 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['캐릭터 선택에서 고양이를 고르기 전이다'],
  params: null,
  expected: null,
});

const 조작안내 = defineCase({
  tcId: 'CGP-FN-235',
  name: '캐릭터 선택 아래 조작 안내를 읽으면 「Q E 캐릭터 선택」 · 「이동」 · 「Tab 자세히」 · 「Enter 선택」 · 「Esc 취소」가 보인다',
  platforms: ['windows'],
  precondition: ['캐릭터 선택에 있다'],
  params: null,
  expected: null,
});

const 식물고르기창 = defineCase({
  tcId: 'CGP-FN-226',
  name: '첫 식물 칸에서 Enter 를 누르면 식물 다섯을 고르는 창이 열리고 고른 식물의 이름 · 태그 · 「데미지」 · 「사거리」 · 「공격 속도」가 보인다',
  platforms: ['windows'],
  precondition: ['캐릭터 선택에 있다'],
  params: null,
  expected: null,
});

const 같은식물옮기기 = defineCase({
  tcId: 'CGP-FN-229',
  name: '둘째 칸에서 첫 칸과 같은 식물을 고르면 첫 칸이 비고 그 식물이 둘째 칸으로 옮겨진다',
  platforms: ['windows'],
  precondition: ['첫 칸에 식물이 들어 있다'],
  params: null,
  expected: null,
});

const 준비버튼 = defineCase({
  tcId: 'CGP-FN-232',
  name: '식물 칸 셋을 서로 다른 식물로 채우면 「준비」 버튼이 뜬다',
  platforms: ['windows'],
  precondition: ['식물 칸이 다 차 있지 않다'],
  params: null,
  expected: null,
});

const 맵선택열기 = defineCase({
  tcId: 'CGP-FN-244',
  name: '캐릭터 선택에서 「준비」를 누르면 「맵 선택」 창에 맵 이름 「소심한 눈사람」 · 「소형」 · 「쉬움」과 좌우 버튼 · 「랭킹」 버튼이 보인다',
  platforms: ['windows'],
  precondition: ['식물 칸 셋이 차 있다'],
  params: null,
  expected: null,
});

const 랭킹열기 = defineCase({
  tcId: 'CGP-FN-247',
  name: '「맵 선택」 창에서 「랭킹」을 누르면 「랭킹」 창에 맵 이름 · 「1인」~「4인」 · 「내 기록」이 보인다',
  platforms: ['windows'],
  precondition: ['「맵 선택」 창이 열려 있다'],
  params: null,
  expected: null,
});

const 랭킹안내 = defineCase({
  tcId: 'CGP-FN-250',
  name: 'Steam 없이 켠 게임에서 「랭킹」 창의 안내 글을 읽으면 「지금은 랭킹을 볼 수 없어요」가 보인다',
  platforms: ['windows'],
  precondition: ['Steam 없이 켠 게임이다'],
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-002',
  name: '빠른 시작 — 인원수 선택부터 랭킹 창까지',
  platforms: ['windows'],
  precondition: [],
  cases: [인원수선택, 알림창띄우기, 고양이고르기, 조작안내, 식물고르기창, 같은식물옮기기, 준비버튼, 맵선택열기, 랭킹열기, 랭킹안내],
});

test(procedure, async ({ game }) => {
  await test.case(인원수선택, async () => {
    await test.step('게임에서 메인 메뉴를 연다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await verify('메인 메뉴에 「빠른시작」 버튼이 보인다', await 메뉴.보이나(메인메뉴화면.버튼글.빠른시작), true, { blocker: true });
    });
    await test.step('메인 메뉴에서 「빠른시작」을 누른다', async () => {
      const 메뉴 = await 메인메뉴화면.열기(game);
      await 메뉴.빠른시작누르기();
      const 창 = await 인원수창읽기(game);
      const 제목 = await verify('「인원수 선택」 창이 보인다', 창.제목, '인원수 선택');
      const 일P = await verify('「1P」 버튼이 보인다', 창.버튼['1P'], '1P');
      const 이P = await verify('「2P」 버튼이 보인다', 창.버튼['2P'], '2P');
      const 삼P = await verify('「3P」 버튼이 보인다', 창.버튼['3P'], '3P');
      const 사P = await verify('「4P」 버튼이 보인다', 창.버튼['4P'], '4P');
      const 배치 = await game.layout(창경로(인원수선택창.주소));
      await verify('인원수 선택 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify('메인 메뉴에서 「빠른시작」을 누르면 「인원수 선택」 창에 「1P」 · 「2P」 · 「3P」 · 「4P」 버튼이 보인다', 제목 && 일P && 이P && 삼P && 사P, true);
    });
  });

  await test.case(알림창띄우기, async () => {
    await test.step('인원수 선택 창에서 「1P」를 눌러 캐릭터 선택으로 간다', async () => {
      const 창 = await 인원수선택창.기다리기(game);
      await 창.누르기('1P');
      await 캐릭터선택화면.기다리기(game);
    });
    await test.step('캐릭터 선택에서 Esc 를 누른다', async () => {
      const 알림 = await 알림창.띄우기(game);
      const 값 = await 알림창읽기(알림);
      const 제목 = await verify('「알림」 창이 보인다', 값.제목, '알림');
      const 내용 = await verify('「메인 메뉴로 돌아가시겠습니까?」가 보인다', 값.내용, '메인 메뉴로 돌아가시겠습니까?');
      const 취소 = await verify('「취소」 버튼이 보인다', 값.취소, '취소');
      const 확인 = await verify('「확인」 버튼이 보인다', 값.확인, '확인');
      const 배치 = await game.layout(알림창.창);
      await verify('알림 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify('캐릭터 선택에서 Esc 를 누르면 「알림」 창에 「메인 메뉴로 돌아가시겠습니까?」와 「취소」 · 「확인」 버튼이 보인다', 제목 && 내용 && 취소 && 확인, true);
    });
  });

  await test.case(고양이고르기, async () => {
    await test.step('알림 창에서 「취소」를 눌러 닫는다', async () => {
      await 알림창닫기(game);
    });
    await test.step('캐릭터 선택에서 고양이를 Enter 로 고른다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 선택.고양이고르기();
      const 안내 = await verify('「식물을 선택해 주세요.」 안내가 보인다', await 읽기(game, 캐릭터선택화면.안내), '식물을 선택해 주세요.');
      const 칸 = await verify('식물 칸 셋이 보인다', await 선택.칸수(), 3);
      await verify('캐릭터 선택에서 고양이를 Enter 로 고르면 「식물을 선택해 주세요.」 안내와 식물 칸 셋이 보인다', 안내 && 칸, true);
    });
  });

  await test.case(조작안내, async () => {
    await test.step('캐릭터 선택 아래 조작 안내를 읽는다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      const 안내 = await 조작안내읽기(선택);
      const 바꾸기 = await verify('「Q E 캐릭터 선택」이 보인다', 안내.캐릭터선택, 'Q E 캐릭터 선택');
      const 이동 = await verify('「이동」이 보인다', 안내.이동, '이동');
      const 자세히 = await verify('「Tab 자세히」가 보인다', 안내.자세히, 'Tab 자세히');
      const 고르기 = await verify('「Enter 선택」이 보인다', 안내.선택, 'Enter 선택');
      const 취소 = await verify('「Esc 취소」가 보인다', 안내.취소, 'Esc 취소');
      await verify(
        '캐릭터 선택 아래 조작 안내를 읽으면 「Q E 캐릭터 선택」 · 「이동」 · 「Tab 자세히」 · 「Enter 선택」 · 「Esc 취소」가 보인다',
        바꾸기 && 이동 && 자세히 && 고르기 && 취소,
        true,
      );
    });
  });

  await test.case(식물고르기창, async () => {
    await test.step('캐릭터 선택에서 첫 식물 칸으로 옮긴다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 선택.칸옮기기('LeftArrow', 3);
    });
    await test.step('첫 식물 칸에서 Enter 를 누른다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      const 열림 = await verify('식물을 고르는 창이 열린다', await 선택.고르기창열기(), true);
      const 식물 = await 고르기창읽기(game, 선택);
      const 다섯 = await verify('고르는 창에 식물 다섯이 보인다', 식물.식물수, 5);
      const 이름 = await verify('고른 식물의 이름이 보인다', 식물.이름 !== '', true);
      const 태그 = await verify('고른 식물의 태그가 보인다', 식물.첫태그 !== '' && 식물.둘째태그 !== '', true);
      const 데미지 = await verify('「데미지」가 보인다', 식물.데미지, '데미지');
      const 사거리 = await verify('「사거리」가 보인다', 식물.사거리, '사거리');
      const 공격속도 = await verify('「공격 속도」가 보인다', 식물.공격속도, '공격 속도');
      const 배치 = await game.layout(캐릭터선택화면.고르기창);
      await verify('식물 고르기 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify(
        '첫 식물 칸에서 Enter 를 누르면 식물 다섯을 고르는 창이 열리고 고른 식물의 이름 · 태그 · 「데미지」 · 「사거리」 · 「공격 속도」가 보인다',
        열림 && 다섯 && 이름 && 태그 && 데미지 && 사거리 && 공격속도,
        true,
      );
    });
  });

  await test.case(같은식물옮기기, async () => {
    await test.step('고르기 창에서 첫 식물을 골라 첫 칸을 채운다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 첫칸에첫식물넣기(game, 선택);
      await verify('첫 칸에 식물이 들어 있다', await 칸식물될때까지(선택, 1, 식물이름들[0]), 식물이름들[0]);
    });
    await test.step('둘째 칸에서 첫 칸과 같은 식물을 고른다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 선택.칸옮기기('RightArrow', 1);
      await 선택.고르기창열기();
      await 선택.고르기창에서고르기(0);
      const 첫칸 = await verify('첫 칸이 비어 있다', await 칸식물될때까지(선택, 1, '빈칸'), '빈칸');
      const 둘째칸 = await verify('그 식물이 둘째 칸에 있다', await 칸식물될때까지(선택, 2, 식물이름들[0]), 식물이름들[0]);
      await verify('둘째 칸에서 첫 칸과 같은 식물을 고르면 첫 칸이 비고 그 식물이 둘째 칸으로 옮겨진다', 첫칸 && 둘째칸, true);
    });
  });

  await test.case(준비버튼, async () => {
    await test.step('식물 칸에서 칸 하나를 비운다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await verify('식물 칸이 다 차 있지 않다', await 칸하나비우기(선택), true);
    });
    await test.step('식물 칸 셋을 서로 다른 식물로 채운다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 선택.칸채우기(기본식물차례);
      await verify('식물 칸 셋을 서로 다른 식물로 채우면 「준비」 버튼이 뜬다', await 선택.준비뜰때까지(), true);
    });
  });

  await test.case(맵선택열기, async () => {
    await test.step('캐릭터 선택에서 「준비」가 뜰 때까지 기다린다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 선택.칸채우기(기본식물차례);
      await game.waitFor(캐릭터선택화면.준비글, { timeoutMs: 5_000 });
    });
    await test.step('캐릭터 선택에서 「준비」를 누른다', async () => {
      const 선택 = await 캐릭터선택화면.기다리기(game);
      await 선택.준비누르기();
      const 맵 = await 맵선택읽기(game);
      const 제목 = await verify('「맵 선택」 창이 보인다', 맵.제목, '맵 선택');
      const 이름 = await verify('맵 이름 「소심한 눈사람」이 보인다', 맵.맵이름, '소심한 눈사람');
      const 크기 = await verify('「소형」이 보인다', 맵.크기, '소형');
      const 난이도 = await verify('「쉬움」이 보인다', 맵.난이도, '쉬움');
      const 왼쪽 = await verify('왼쪽 버튼이 보인다', 맵.왼쪽, true);
      const 오른쪽 = await verify('오른쪽 버튼이 보인다', 맵.오른쪽, true);
      const 랭킹 = await verify('「랭킹」 버튼이 보인다', 맵.랭킹, '랭킹');
      const 배치 = await game.layout(맵선택창.창);
      await verify('맵 선택 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify(
        '캐릭터 선택에서 「준비」를 누르면 「맵 선택」 창에 맵 이름 「소심한 눈사람」 · 「소형」 · 「쉬움」과 좌우 버튼 · 「랭킹」 버튼이 보인다',
        제목 && 이름 && 크기 && 난이도 && 왼쪽 && 오른쪽 && 랭킹,
        true,
      );
    });
  });

  await test.case(랭킹열기, async () => {
    await test.step('「맵 선택」 창에서 「랭킹」을 누른다', async () => {
      const 맵 = await 맵선택창.기다리기(game);
      await 맵.랭킹누르기();
      const 창 = await 랭킹창읽기(game);
      const 제목 = await verify('「랭킹」 창이 보인다', 창.제목, '랭킹');
      const 이름 = await verify('맵 이름이 보인다', 창.맵이름 !== '', true);
      const 한명 = await verify('「1인」이 보인다', 창.인원탭[0], '1인');
      const 두명 = await verify('「2인」이 보인다', 창.인원탭[1], '2인');
      const 세명 = await verify('「3인」이 보인다', 창.인원탭[2], '3인');
      const 네명 = await verify('「4인」이 보인다', 창.인원탭[3], '4인');
      const 내기록 = await verify('「내 기록」이 보인다', 창.내기록, '내 기록');
      const 배치 = await game.layout(창경로(랭킹창.주소));
      await verify('랭킹 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify(
        '「맵 선택」 창에서 「랭킹」을 누르면 「랭킹」 창에 맵 이름 · 「1인」~「4인」 · 「내 기록」이 보인다',
        제목 && 이름 && 한명 && 두명 && 세명 && 네명 && 내기록,
        true,
      );
    });
  });

  await test.case(랭킹안내, async () => {
    await test.step('「랭킹」 창의 안내 글을 읽는다', async () => {
      await 랭킹창.기다리기(game);
      await verify(
        'Steam 없이 켠 게임에서 「랭킹」 창의 안내 글을 읽으면 「지금은 랭킹을 볼 수 없어요」가 보인다',
        await 읽기(game, 랭킹창.못봄안내),
        '지금은 랭킹을 볼 수 없어요',
      );
    });
  });
});
