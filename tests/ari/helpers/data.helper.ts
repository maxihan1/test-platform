import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 본문글, 본문JSON, 인증헤더 } from './api.helper.js';

export const 서버오류글 = 'Error occured on server.  See server logs for more details.';

export interface 캐릭터행 {
  id: number;
  accountId: number;
  name: string;
  saveData: string;
}

export interface 저장행 {
  id: number;
  name?: string;
  saveData: string;
  playerCharacterId?: number;
  itemInstanceId?: number;
}

export interface 제한상태 {
  accountId: number;
  suspended: boolean;
  suspendedUntil: string | null;
  suspendReason: string | null;
  chatMuted: boolean;
  chatMutedUntil: string | null;
  chatMuteReason: string | null;
  maintenanceBlocked: boolean;
}

export function 서버로그인(request: APIRequestContext, 공유비밀: string): Promise<APIResponse> {
  return request.post('/api/serverlogin', { data: { SharedSecret: 공유비밀 } });
}

export async function 서버토큰(request: APIRequestContext, 공유비밀: string): Promise<{ status: number; token: string }> {
  const 응답 = await 서버로그인(request, 공유비밀);
  if (!응답.ok()) return { status: 응답.status(), token: '' };
  return { status: 응답.status(), token: (await 본문JSON<{ token: string }>(응답)).token };
}

export function 데이터부르기(request: APIRequestContext, 토큰: string, 경로: string, 본문: unknown = {}): Promise<APIResponse> {
  return request.post(`/api/${경로}`, { headers: 인증헤더(토큰), data: 본문 });
}

export function 날글로부르기(request: APIRequestContext, 토큰: string, 경로: string, 글: string): Promise<APIResponse> {
  return request.post(`/api/${경로}`, { headers: { ...인증헤더(토큰), 'Content-Type': 'application/json' }, data: 글 });
}

export async function 응답글(응답: APIResponse): Promise<string> {
  return (await 본문글(응답)).trim();
}

export function 고유값(): number {
  return Date.now() % 1_000_000_000 + Math.floor(Math.random() * 1000);
}

export function 시험계정번호(): number {
  return 1_900_000_000 + Math.floor(Math.random() * 90_000_000);
}

export function 없는번호(): number {
  return 2_100_000_000 + Math.floor(Math.random() * 40_000_000);
}

export function 새아이템번호(): number {
  return 8_000_000_000_000_000 + Date.now() * 100 + Math.floor(Math.random() * 100);
}

export function 고유캐릭터이름(머리: string): string {
  return `qa_tmp_${머리}_${고유값()}`;
}

export async function 번호받기(응답: APIResponse): Promise<number> {
  if (!응답.ok()) return 0;
  return (await 본문JSON<{ id: number }>(응답)).id;
}

export function 캐릭터만들기(request: APIRequestContext, 토큰: string, 계정번호: number, 이름: string, 저장데이터 = '{}'): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'createplayercharacter', { AccountId: 계정번호, Name: 이름, SaveData: 저장데이터 });
}

export async function 캐릭터만들고번호(request: APIRequestContext, 토큰: string, 계정번호: number, 이름: string, 저장데이터 = '{}'): Promise<number> {
  return 번호받기(await 캐릭터만들기(request, 토큰, 계정번호, 이름, 저장데이터));
}

export function 캐릭터저장(request: APIRequestContext, 토큰: string, 번호: number, 이름: string, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'saveplayercharacter', { Id: 번호, Name: 이름, SaveData: 저장데이터 });
}

export function 캐릭터지우기(request: APIRequestContext, 토큰: string, 번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'deleteplayercharacter', { Id: 번호 });
}

export async function 캐릭터들지우기(request: APIRequestContext, 토큰: string, 번호들: number[]): Promise<void> {
  for (const 번호 of 번호들.filter((n) => n > 0)) await 캐릭터지우기(request, 토큰, 번호);
}

export async function 계정캐릭터목록(request: APIRequestContext, 토큰: string, 계정번호: number): Promise<캐릭터행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getplayercharacters', { AccountId: 계정번호 });
  if (!응답.ok()) return [];
  return (await 본문JSON<{ playerCharacters: 캐릭터행[] }>(응답)).playerCharacters;
}

export async function 전체캐릭터목록(request: APIRequestContext, 토큰: string): Promise<캐릭터행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getallplayercharacters');
  if (!응답.ok()) return [];
  return (await 본문JSON<{ playerCharacters: 캐릭터행[] }>(응답)).playerCharacters;
}

export async function 친구목록전체(request: APIRequestContext, 토큰: string): Promise<저장행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getfriendlists');
  if (!응답.ok()) return [];
  return (await 본문JSON<{ friendLists: 저장행[] }>(응답)).friendLists;
}

export function 친구목록저장(request: APIRequestContext, 토큰: string, 캐릭터번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'savefriendlist', { PlayerCharacterId: 캐릭터번호, SaveData: 저장데이터 });
}

export function 길드저장데이터(길드이름: string, 멤버번호들: number[] = []): string {
  return JSON.stringify({ GuildId: 0, GuildName: 길드이름, MemberList: 멤버번호들.map((n) => ({ CharacterId: n })) });
}

export function 길드만들기(request: APIRequestContext, 토큰: string, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'createguild', { SaveData: 저장데이터 });
}

export async function 길드만들고번호(request: APIRequestContext, 토큰: string, 저장데이터: string): Promise<number> {
  return 번호받기(await 길드만들기(request, 토큰, 저장데이터));
}

export function 길드저장(request: APIRequestContext, 토큰: string, 번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'saveguild', { Id: 번호, SaveData: 저장데이터 });
}

export function 길드지우기(request: APIRequestContext, 토큰: string, 번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'deleteguild', { Id: 번호 });
}

export async function 길드들지우기(request: APIRequestContext, 토큰: string, 번호들: number[]): Promise<void> {
  for (const 번호 of 번호들.filter((n) => n > 0)) await 길드지우기(request, 토큰, 번호);
}

export async function 길드목록(request: APIRequestContext, 토큰: string): Promise<저장행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getguilds');
  if (!응답.ok()) return [];
  return (await 본문JSON<{ guilds: 저장행[] }>(응답)).guilds;
}

export function 경매저장데이터(아이템이름: string, 가격 = 100): string {
  return JSON.stringify({ AuctionItemId: 0, ItemName: 아이템이름, Price: 가격, SellerName: 'qa_tmp_seller', Fee: 0 });
}

export function 경매만들기(request: APIRequestContext, 토큰: string, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'createauctionitem', { SaveData: 저장데이터 });
}

export async function 경매만들고번호(request: APIRequestContext, 토큰: string, 저장데이터: string): Promise<number> {
  return 번호받기(await 경매만들기(request, 토큰, 저장데이터));
}

export function 경매저장(request: APIRequestContext, 토큰: string, 번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'saveauctionitem', { Id: 번호, SaveData: 저장데이터 });
}

export function 경매지우기(request: APIRequestContext, 토큰: string, 번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'deleteauctionitem', { Id: 번호 });
}

export async function 경매들지우기(request: APIRequestContext, 토큰: string, 번호들: number[]): Promise<void> {
  for (const 번호 of 번호들.filter((n) => n > 0)) await 경매지우기(request, 토큰, 번호);
}

export async function 경매목록(request: APIRequestContext, 토큰: string): Promise<저장행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getauctionitems');
  if (!응답.ok()) return [];
  return (await 본문JSON<{ auctionItems: 저장행[] }>(응답)).auctionItems;
}

export function 아이템저장데이터(아이템이름: string, 품질 = 'Common'): string {
  return JSON.stringify({ ItemName: 아이템이름, DisplayName: 아이템이름, ItemQuality: 품질, DropLevel: 1 });
}

export function 아이템만들기(request: APIRequestContext, 토큰: string, 아이템번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'createiteminstance', { ItemInstanceId: 아이템번호, SaveData: 저장데이터 });
}

export function 아이템저장(request: APIRequestContext, 토큰: string, 아이템번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'saveiteminstance', { ItemInstanceId: 아이템번호, SaveData: 저장데이터 });
}

export function 아이템지우기(request: APIRequestContext, 토큰: string, 아이템번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'deleteiteminstance', { ItemInstanceId: 아이템번호 });
}

export async function 아이템목록(request: APIRequestContext, 토큰: string): Promise<저장행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getiteminstances');
  if (!응답.ok()) return [];
  return (await 본문JSON<{ itemInstances: 저장행[] }>(응답)).itemInstances;
}

export async function 같은아이템번호행들(request: APIRequestContext, 토큰: string, 아이템번호: number): Promise<저장행[]> {
  return (await 아이템목록(request, 토큰)).filter((x) => x.itemInstanceId === 아이템번호).sort((a, b) => a.id - b.id);
}

export async function 아이템모두지우기(request: APIRequestContext, 토큰: string, 아이템번호: number): Promise<void> {
  for (let 회 = 0; 회 < 5; 회 += 1) {
    if ((await 같은아이템번호행들(request, 토큰, 아이템번호)).length === 0) return;
    await 아이템지우기(request, 토큰, 아이템번호);
  }
}

export function 우편저장데이터(제목: string, 덮어쓸것: Record<string, unknown> = {}): string {
  return JSON.stringify({ MessageId: 0, Sender: 'qa_tmp_sender', Recipient: '', Subject: 제목, Body: '', AttachmentSlots: [], CurrencyAmount: 0, IsRead: false, ...덮어쓸것 });
}

export function 우편만들기(request: APIRequestContext, 토큰: string, 캐릭터번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'createmailmessage', { PlayerCharacterId: 캐릭터번호, SaveData: 저장데이터 });
}

export async function 우편만들고번호(request: APIRequestContext, 토큰: string, 캐릭터번호: number, 저장데이터: string): Promise<number> {
  return 번호받기(await 우편만들기(request, 토큰, 캐릭터번호, 저장데이터));
}

export function 우편저장(request: APIRequestContext, 토큰: string, 번호: number, 저장데이터: string): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'savemailmessage', { Id: 번호, SaveData: 저장데이터 });
}

export function 우편지우기(request: APIRequestContext, 토큰: string, 번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'deletemailmessage', { Id: 번호 });
}

export async function 우편들지우기(request: APIRequestContext, 토큰: string, 번호들: number[]): Promise<void> {
  for (const 번호 of 번호들.filter((n) => n > 0)) await 우편지우기(request, 토큰, 번호);
}

export function 우편하나(request: APIRequestContext, 토큰: string, 번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'getmailmessage', { MessageId: 번호 });
}

export async function 우편목록(request: APIRequestContext, 토큰: string, 캐릭터번호: number): Promise<저장행[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getmailmessages', { PlayerCharacterId: 캐릭터번호 });
  if (!응답.ok()) return [];
  return (await 본문JSON<{ mailMessages: 저장행[] }>(응답)).mailMessages;
}

export function 제한상태부르기(request: APIRequestContext, 토큰: string, 계정번호: number): Promise<APIResponse> {
  return 데이터부르기(request, 토큰, 'getaccountrestrictions', { AccountId: 계정번호 });
}

export async function 제한상태읽기(request: APIRequestContext, 토큰: string, 계정번호: number): Promise<제한상태 | null> {
  const 응답 = await 제한상태부르기(request, 토큰, 계정번호);
  if (!응답.ok()) return null;
  return 본문JSON<제한상태>(응답);
}

export function 첨부번호글들(우편저장글: string): string[] {
  const 칸들 = /"AttachmentSlots":\[(.*?)\](?=,"CurrencyAmount"|\}$)/.exec(우편저장글)?.[1] ?? '';
  return [...칸들.matchAll(/\d+/g)].map((m) => m[0]);
}

export async function 아이템저장글들(request: APIRequestContext, 토큰: string, 번호글들: string[]): Promise<string[]> {
  const 응답 = await 데이터부르기(request, 토큰, 'getiteminstances');
  if (!응답.ok()) return [];
  const 글 = await 본문글(응답);
  const 찾음: string[] = [];
  for (const m of 글.matchAll(/"itemInstanceId":(\d+),"saveData":"((?:[^"\\]|\\.)*)"/g)) {
    if (번호글들.includes(m[1] ?? '')) 찾음.push(JSON.parse(`"${m[2] ?? ''}"`) as string);
  }
  return 찾음;
}

export function 첨부바꾸기(우편저장글: string, 남길칸수: number): string {
  return 우편저장글.replace(/"AttachmentSlots":\[(.*?)\](?=,"CurrencyAmount"|\}$)/, (_, 칸글: string) => {
    const 칸들 = [...칸글.matchAll(/\{[^{}]*\}/g)].map((m) => m[0]);
    return `"AttachmentSlots":[${칸들.slice(0, 남길칸수).join(',')}]`;
  });
}
