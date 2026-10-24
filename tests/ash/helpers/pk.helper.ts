import type { APIRequestContext, APIResponse } from '@playwright/test';

import { type 가방, type 계정, type 구역, 머리, type 바닥아이템, 본문, type 봇, type 성향, type 스폰, type 아이템, 인증머리, type 캐릭터, type 캐릭터정보 } from './api.helper.js';
import { 가방읽기, 구역자리, 아이템지우기 } from './game-state.helper.js';

export interface 죽음결과 {
  expLost: number;
  dropped: 바닥아이템 | null;
  character: 캐릭터정보;
}

export interface 봇처치결과 {
  dropped: 아이템 | null;
  droppedToGround: boolean;
  groundItemId: number | null;
  alignmentDelta: number;
  character: 캐릭터정보;
  bot: 봇;
}

export interface 선공결과 {
  attacker: 성향;
  target: 성향;
  attackerBecamePurple: boolean;
}

export interface 줍기결과 {
  item: 아이템;
  pickedByKind: 'Character' | 'Bot';
  pickedById: number;
  inventory: 가방 | null;
}

const 글자판 = 'abcdefghijklmnopqrstuvwxyz0123456789';
const 숫자판 = '0123456789';

export function 무작위글(길이: number, 판: string = 글자판): string {
  return Array.from({ length: 길이 }, () => 판[Math.floor(Math.random() * 판.length)] ?? 'a').join('');
}

export function 무작위숫자(길이: number): string {
  return 무작위글(길이, 숫자판);
}

export function 길이맞춘아이디(앞머리: string, 길이: number): string {
  return `${앞머리}${무작위글(길이 - 앞머리.length)}`;
}

export function 서버지금(응답: APIResponse): number {
  const 글 = 응답.headers()['date'];
  const 값 = 글 === undefined ? Number.NaN : Date.parse(글);
  return Number.isNaN(값) ? Date.now() : 값;
}

export async function 캐릭터정보와시각(요청: APIRequestContext, 누구: 캐릭터): Promise<{ 정보: 캐릭터정보; 지금: number }> {
  const 응답 = await 요청.get(`/characters/${String(누구.번호)}`, { headers: 인증머리(누구) });
  const 정보 = await 본문<캐릭터정보>(응답, '캐릭터 정보');
  return { 정보, 지금: 서버지금(응답) };
}

export function PK공격(요청: APIRequestContext, 가해: 캐릭터, 대상: { id: number }, 자리 = 구역자리.Beginner): Promise<APIResponse> {
  return 요청.post('/combat/pk-attack', {
    headers: 머리(가해),
    data: { attackerKind: 'Character', attackerId: 가해.번호, targetKind: 'Bot', targetId: 대상.id, x: 자리.x, z: 자리.z },
  });
}

export function GM성향바꾸기(요청: APIRequestContext, 누구: 캐릭터, 값: number): Promise<APIResponse> {
  return 요청.post('/gm/alignment', { headers: 머리(누구), data: { value: 값, clearPurple: false } });
}

export function 죽음응답(요청: APIRequestContext, 누구: 캐릭터, 자리 = 구역자리.Beginner): Promise<APIResponse> {
  return 요청.post('/combat/player-death', { headers: 머리(누구), data: { killerType: 'Monster', killerId: null, x: 자리.x, z: 자리.z } });
}

export async function 죽음보고(요청: APIRequestContext, 누구: 캐릭터, 자리 = 구역자리.Beginner): Promise<죽음결과> {
  return 본문<죽음결과>(await 죽음응답(요청, 누구, 자리), '사망 보고');
}

export function 봇처치(요청: APIRequestContext, 누구: 캐릭터, 봇값: { id: number; zone?: 구역 }, 자리 = 구역자리[봇값.zone ?? 'Beginner']): Promise<APIResponse> {
  return 요청.post('/combat/bot-kill', { headers: 머리(누구), data: { botId: 봇값.id, x: 자리.x, z: 자리.z } });
}

export function 임프처치(요청: APIRequestContext, 누구: 캐릭터, 스폰값: 스폰): Promise<APIResponse> {
  return 요청.post('/combat/monster-kill', { headers: 머리(누구), data: { monsterId: 스폰값.monster, spawnId: 스폰값.id, x: 스폰값.x, z: 스폰값.z } });
}

export async function 바닥아이템목록(요청: APIRequestContext, 누구: 캐릭터, 어디: 구역): Promise<바닥아이템[]> {
  return 본문<바닥아이템[]>(await 요청.get(`/world/ground-items?zone=${어디}`, { headers: 머리(누구) }), '바닥 아이템 목록');
}

export async function 바닥아이템찾기(요청: APIRequestContext, 누구: 캐릭터, 어디: 구역, 번호: number): Promise<바닥아이템 | undefined> {
  return (await 바닥아이템목록(요청, 누구, 어디)).find((g) => g.id === 번호);
}

export function 줍기(요청: APIRequestContext, 누구: 캐릭터, 바닥: { id: number; x: number; z: number }, 봇번호?: number): Promise<APIResponse> {
  const 자리 = 봇번호 === undefined ? { x: 바닥.x, z: 바닥.z } : { botId: 봇번호, x: 바닥.x, z: 바닥.z };
  return 요청.post(`/world/ground-items/${String(바닥.id)}/pickup`, { headers: 머리(누구), data: 자리 });
}

export async function 목록에서사라질때까지(요청: APIRequestContext, 누구: 캐릭터, 어디: 구역, 번호: number, 한도ms: number): Promise<void> {
  const 끝 = Date.now() + 한도ms;
  while ((await 바닥아이템찾기(요청, 누구, 어디, 번호)) !== undefined && Date.now() < 끝) {
    await new Promise<void>((풀림) => setTimeout(풀림, 2000));
  }
}

export async function 어드민키상태(admin: APIRequestContext): Promise<number> {
  return (await admin.get('/admin/config')).status();
}

export async function 계정수(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 목록 = await 본문<unknown[]>(await admin.get(`/admin/accounts?prefix=${encodeURIComponent(아이디)}&limit=10`), '계정 목록');
  return 목록.length;
}

export function 리프레시(요청: APIRequestContext, 리프레시값: string): Promise<APIResponse> {
  return 요청.post('/auth/refresh', { data: { refreshToken: 리프레시값 } });
}

export function 로그인응답(요청: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return 요청.post('/auth/login', { data: { username: 아이디, password: 비밀번호 } });
}

export function 이름으로캐릭터만들기(요청: APIRequestContext, 누구: 계정, 이름: string): Promise<APIResponse> {
  return 요청.post('/characters', { headers: 인증머리(누구), data: { name: 이름, classType: 'Warrior', gender: 'Male' } });
}

export async function 상한까지캐릭터만들기(요청: APIRequestContext, 누구: 계정, 한도 = 50): Promise<APIResponse> {
  let 응답 = await 이름으로캐릭터만들기(요청, 누구, 무작위글(10));
  for (let 번 = 1; 번 < 한도 && 응답.status() === 201; 번 += 1) {
    응답 = await 이름으로캐릭터만들기(요청, 누구, 무작위글(10));
  }
  return 응답;
}

export async function 장착만남기기(admin: APIRequestContext, 누구: 캐릭터): Promise<void> {
  const 가방값 = await 가방읽기(admin, 누구);
  for (const 칸 of 가방값.items) {
    if (칸.equippedSlot === null) await 아이템지우기(admin, 누구, 칸.id);
  }
}

export function 가방서명(가방값: 가방): string {
  return 가방값.items
    .map((i) => `${i.templateId}:${String(i.quantity)}:${String(i.enhanceLevel)}:${i.equippedSlot ?? ''}`)
    .sort()
    .join('|');
}
