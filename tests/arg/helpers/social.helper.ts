import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 접속안내창 } from '../pages/notice.page.js';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 친구파티창 } from '../pages/friend.page.js';
import { 길드창 } from '../pages/guild.page.js';
import { 초대창 } from '../pages/invite.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 로비화면 } from '../pages/lobby.page.js';
import { 로비로 } from './game-enter.helper.js';
import { GM, 봇로그, 봇시키기, 봇이본글기다리기, 봇켜기, 상단바골드, 접속자 } from './game-state.helper.js';

const 토스트칸 = '/Showcase HUD/Toasts';
const 나가기확인 = '/SettingsPanelCanvas/QuitPanel/Confirm Button';

export async function 토스트떴나(game: GameDriver, 글: string, 시간 = 10_000): Promise<boolean> {
  const 떴다 = await game.waitFor(`${토스트칸}//*[contains(@text,${글})]`, { timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
  if (떴다) return true;
  return await new 공통HUD(game).알림기다리기(글, 2_000);
}

export async function 봇이볼때까지(admin: APIRequestContext, 봇: string, 글: string, 시간 = 15_000): Promise<boolean> {
  return (await 봇이본글기다리기(admin, 봇, 글, 시간)) !== null;
}

export async function 봇골드주기(admin: APIRequestContext, 봇: string, 골드: number): Promise<void> {
  await 봇시키기(admin, 봇, `gm:gold ${String(골드)}`);
}

export async function 봇이초대에답하기(
  admin: APIRequestContext,
  봇: string,
  종류: 'friend' | 'party' | 'guild',
  답: 'accept' | 'decline',
  시간 = 15_000,
): Promise<string> {
  const 끝 = Date.now() + 시간;
  do {
    const 초대 = (await 봇로그(admin, 봇)).filter((줄) => 줄.type === 'invite' && 줄.data.Kind === 종류 && typeof 줄.data.From === 'string').at(-1);
    if (초대 !== undefined) {
      const 보낸이 = String(초대.data.From);
      await 봇시키기(admin, 봇, `${종류}_${답}:${보낸이}`);
      return 보낸이;
    }
  } while (Date.now() < 끝);
  throw new Error(`${봇} 가 받은 ${종류} 초대가 ${String(시간 / 1000)}초 안에 없다`);
}

export async function 켜져있나(admin: APIRequestContext, 봇: string): Promise<boolean> {
  return (await 접속자(admin)).bots.includes(봇);
}

export async function 봇이친구신청해수락하기(game: GameDriver, admin: APIRequestContext, 봇: string, 내이름: string): Promise<void> {
  await 봇시키기(admin, 봇, `friend_add:${내이름}`);
  const 창 = await 초대창.뜰때까지(game, '친구 신청');
  if (창 === null) throw new Error(`${봇} 가 보낸 친구 신청 창이 뜨지 않았다`);
  await 창.수락();
  if (!(await 토스트떴나(game, `${봇} 님과 친구가 되었습니다`))) throw new Error(`${봇} 님과 친구가 되었다는 알림이 뜨지 않았다`);
}

export async function 친구신청해봇이수락하기(game: GameDriver, admin: APIRequestContext, 봇: string): Promise<void> {
  const 창 = await 친구파티창.열기(game);
  await 창.친구신청하기(봇);
  if (!(await 토스트떴나(game, `${봇} 님에게 친구 신청을 보냈습니다`))) throw new Error(`${봇} 님에게 친구 신청을 보냈다는 알림이 뜨지 않았다`);
  await 봇이초대에답하기(admin, 봇, 'friend', 'accept');
  if (!(await 토스트떴나(game, `${봇} 님과 친구가 되었습니다`))) throw new Error(`${봇} 님과 친구가 되었다는 알림이 뜨지 않았다`);
}

export async function 내가봇을파티에초대해수락시키기(game: GameDriver, admin: APIRequestContext, 봇: string): Promise<void> {
  const 창 = await 친구파티창.열기(game);
  await 창.파티초대하기(봇);
  if (!(await 토스트떴나(game, `${봇} 님을 파티에 초대했습니다`))) throw new Error(`${봇} 님을 파티에 초대했다는 알림이 뜨지 않았다`);
  await 봇이초대에답하기(admin, 봇, 'party', 'accept');
  if (!(await 토스트떴나(game, '님이 파티에 들어왔습니다'))) throw new Error('파티에 들어왔다는 알림이 뜨지 않았다');
  await 창.닫기누르기();
}

export async function 봇이나를파티에초대해수락하기(game: GameDriver, admin: APIRequestContext, 봇: string, 내이름: string): Promise<void> {
  await 봇시키기(admin, 봇, `party_invite:${내이름}`);
  const 창 = await 초대창.뜰때까지(game, '파티 초대');
  if (창 === null) throw new Error(`${봇} 가 보낸 파티 초대 창이 뜨지 않았다`);
  await 창.수락();
  if (!(await 토스트떴나(game, `${내이름} 님이 파티에 들어왔습니다`))) throw new Error('파티에 들어왔다는 알림이 뜨지 않았다');
}

export async function 봇이다른봇을초대해수락시키기(
  admin: APIRequestContext,
  종류: 'party' | 'guild',
  초대한봇: string,
  받는봇: string,
): Promise<void> {
  await 봇로그(admin, 받는봇, true);
  await 봇시키기(admin, 초대한봇, `${종류}_invite:${받는봇}`);
  if (!(await 봇이볼때까지(admin, 받는봇, 초대한봇))) throw new Error(`${받는봇} 가 ${초대한봇} 의 초대를 받지 못했다`);
  await 봇시키기(admin, 받는봇, `${종류}_accept:${초대한봇}`);
  await 봇이볼때까지(admin, 받는봇, 종류 === 'party' ? '파티에 들어왔습니다' : '길드에 들어왔습니다', 8_000);
}

export async function 내가길드만들기(game: GameDriver, 이름: string): Promise<void> {
  const 창 = await 길드창.열기(game);
  await 창.만들기(이름);
  if (!(await 토스트떴나(game, '길드 창설 완료'))) throw new Error(`길드 「${이름}」 창설 완료 알림이 뜨지 않았다`);
  await 창.닫기누르기();
}

export async function 봇이길드만들기(admin: APIRequestContext, 봇: string, 이름: string): Promise<void> {
  await 봇골드주기(admin, 봇, 1000);
  await 봇시키기(admin, 봇, `guild_create:${이름}`);
  if (!(await 봇이볼때까지(admin, 봇, '길드 창설 완료'))) throw new Error(`${봇} 가 길드 「${이름}」 를 만들지 못했다`);
}

export async function 봇이나를길드에초대해수락하기(game: GameDriver, admin: APIRequestContext, 봇: string, 내이름: string): Promise<void> {
  await 봇시키기(admin, 봇, `guild_invite:${내이름}`);
  const 창 = await 초대창.뜰때까지(game, '길드 초대');
  if (창 === null) throw new Error(`${봇} 가 보낸 길드 초대 창이 뜨지 않았다`);
  await 창.수락();
  if (!(await 토스트떴나(game, `${내이름} 님이 길드에 들어왔습니다`))) throw new Error('길드에 들어왔다는 알림이 뜨지 않았다');
}

export async function 내가봇을길드에초대해수락시키기(game: GameDriver, admin: APIRequestContext, 봇: string): Promise<void> {
  const 창 = await 길드창.열기(game);
  await 창.초대하기(봇);
  if (!(await 토스트떴나(game, `${봇} 님을 길드에 초대했습니다`))) throw new Error(`${봇} 님을 길드에 초대했다는 알림이 뜨지 않았다`);
  await 봇이초대에답하기(admin, 봇, 'guild', 'accept');
  if (!(await 토스트떴나(game, `${봇} 님이 길드에 들어왔습니다`))) throw new Error('길드에 들어왔다는 알림이 뜨지 않았다');
  await 창.닫기누르기();
}

export async function 메인메뉴로나갔다돌아오기(game: GameDriver, 아이디: string, 비밀번호: string): Promise<void> {
  await game.click(로비화면.닫기X);
  await game.waitFor(나가기확인, { timeoutMs: 10_000 });
  await game.click(나가기확인);
  await 로그인화면.열기(game);
  await 로비로(game, 아이디, 비밀번호);
}

export async function 봇시켜서친구지우기(admin: APIRequestContext, 봇: string, 비밀번호: string, 지울이름: string): Promise<void> {
  if (!(await 켜져있나(admin, 봇))) await 봇켜기(admin, { user: 봇, pass: 비밀번호 });
  await 봇시키기(admin, 봇, `friend_remove:${지울이름}`);
}

export async function 봇시켜서길드나가기(admin: APIRequestContext, 봇: string, 비밀번호: string): Promise<void> {
  if (!(await 켜져있나(admin, 봇))) await 봇켜기(admin, { user: 봇, pass: 비밀번호 });
  await 봇시키기(admin, 봇, 'guild_leave');
}

export async function 골드가될때까지(game: GameDriver, 값: number, 시간 = 10_000): Promise<number> {
  const 끝 = Date.now() + 시간;
  let 지금 = await 상단바골드(game);
  while (지금 !== 값 && Date.now() < 끝) 지금 = await 상단바골드(game);
  return 지금;
}

export async function 골드맞추기(game: GameDriver, 값: number): Promise<void> {
  await GM(game, `/gm gold ${String(값)}`);
  await 골드가될때까지(game, 값);
}

export async function 길드없애고골드주기(game: GameDriver, 골드: number): Promise<void> {
  const 창 = await 길드창.열기(game);
  await 창.탈퇴누르기();
  if (!(await 창.길드없음안내뜰때까지())) throw new Error('길드 탈퇴 뒤 「아직 길드가 없습니다」가 뜨지 않았다');
  await 창.닫기누르기();
  await 골드맞추기(game, 골드);
  await 길드창.열기(game);
}

const 팝업 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)';

export async function 팝업떠있나(game: GameDriver): Promise<boolean> {
  return await 접속안내창.보이나(game);
}

export async function 팝업닫기(game: GameDriver): Promise<void> {
  if (!(await 팝업떠있나(game))) return;
  await game.click(`${팝업}/Confirm Button`);
  await game.waitForValue(팝업, 'CanvasGroup.alpha', 0, { timeoutMs: 10_000 });
}

export async function 정지창뜰때까지(game: GameDriver, 시간: number): Promise<boolean> {
  return game.waitFor(`${팝업}/TitleText`, { text: '이용 정지 계정', timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
}

export async function 정지창본문(game: GameDriver): Promise<string> {
  return `${글만(await game.text(`${팝업}/TitleText`))} ${글만(await game.text(`${팝업}/MainText`))}`;
}

export async function 초대창닫기(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 4; 번 += 1) {
    if ((await game.find(`${초대창.뒷배경}[0]`)) === null) return;
    await game.click(`${초대창.뒷배경}[0]`);
  }
}

export function 파티장표시(줄들: string[], 이름: string): { 별: boolean; 금색: boolean } {
  const 줄 = 줄들.find((원문) => 글만(원문).includes(이름));
  if (줄 === undefined) return { 별: false, 금색: false };
  const 글 = 글만(줄);
  return { 별: 글.includes('★') && 글.indexOf('★') < 글.indexOf(이름), 금색: /#FFD152[^★]*★/i.test(줄) };
}

export function 점색(원문: string): '초록' | '회색' | '모름' {
  const 맞음 = /<color=#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})[0-9a-fA-F]{0,2}>\s*[●•]/.exec(원문);
  if (맞음 === null) return '모름';
  const [r, g, b] = [1, 2, 3].map((칸) => parseInt(맞음[칸] ?? '0', 16)) as [number, number, number];
  if (g > r + 30 && g > b + 30) return '초록';
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return '회색';
  return '모름';
}

export async function 초대창모두거절(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 6; 번 += 1) {
    const 둘째 = await game.find('/Showcase HUD/Invite[1]');
    const 창 = 둘째 !== null ? '/Showcase HUD/Invite[1]' : (await game.find('/Showcase HUD/Invite')) !== null ? '/Showcase HUD/Invite' : null;
    if (창 === null) return;
    await game.click(`${창}//*[contains(@name,Button 거절)]`);
    await game.waitFor(창, { gone: true, timeoutMs: 5_000 }).catch(() => undefined);
  }
}

export async function 봇을파티에넣기(game: GameDriver, admin: APIRequestContext, 봇: string, 인원: number, 시간 = 20_000): Promise<void> {
  const 창 = await 친구파티창.열기(game);
  await 창.파티초대하기(봇);
  if (!(await 토스트떴나(game, `${봇} 님을 파티에 초대했습니다`))) throw new Error(`${봇} 님을 파티에 초대했다는 알림이 뜨지 않았다`);
  await 봇이초대에답하기(admin, 봇, 'party', 'accept');
  const 끝 = Date.now() + 시간;
  do {
    const 머리줄 = await (await 친구파티창.다시열기(game)).파티머리줄();
    if (머리줄.startsWith(`파티 ${String(인원)}/4`)) return;
  } while (Date.now() < 끝);
  throw new Error(`${봇} 가 들어온 뒤 파티 머리줄이 「파티 ${String(인원)}/4」가 되지 않았다`);
}
