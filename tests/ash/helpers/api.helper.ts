import type { APIRequestContext, APIResponse } from '@playwright/test';

export type 직업 = 'Warrior' | 'Archer' | 'Mage';
export type 구역 = 'Town' | 'Beginner' | 'Intermediate' | 'Boss';
export type 성향상태 = 'Innocent' | 'Purple' | 'Chaotic';
export type 강화결과 = 'Success' | 'Fail' | 'Destroy';

export interface 능력치 {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
}

export interface 성향 {
  value: number;
  state: 성향상태;
  purpleUntil: string | null;
}

export interface 캐릭터정보 {
  id: number;
  name: string;
  classType: 직업;
  gender: 'Male' | 'Female';
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  position: { x: number; y: number; z: number };
  zone: 구역;
  stats: 능력치;
  alignment: 성향;
  pkKills: number;
  pkDeaths: number;
}

export interface 아이템 {
  id: number;
  templateId: string;
  quantity: number;
  enhanceLevel: number;
  equippedSlot: string | null;
  sellPrice: number;
}

export interface 가방 {
  capacity: number;
  used: number;
  gold: number;
  items: 아이템[];
}

export interface 원장줄 {
  id: number;
  reason: string;
  delta: number;
  balanceAfter: number;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
}

export interface 오류본문 {
  code: string;
  message: string;
}

export interface 토큰 {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface 봇 {
  id: number;
  name: string;
  classType: 직업;
  level: number;
  zone: 구역;
  temperament: 'Peaceful' | 'Retaliate' | 'Aggressive';
  alignment: 성향;
  isDead: boolean;
  respawnAt: string | null;
  equipment: 아이템[];
  itemCount: number;
}

export interface 스폰 {
  id: string;
  zone: 구역;
  monster: 'Imp' | 'VandalImp' | 'ImpBoss';
  x: number;
  z: number;
}

export interface 바닥아이템 {
  id: number;
  templateId: string;
  quantity: number;
  enhanceLevel: number;
  zone: 구역;
  x: number;
  z: number;
  expiresAt: string;
}

export interface 계정 {
  아이디: string;
  비밀번호: string;
  토큰: string;
  리프레시: string;
}

export interface 캐릭터 extends 계정 {
  번호: number;
  이름: string;
}

export async function 본문<T>(res: APIResponse, 무엇: string): Promise<T> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function 오류<T = 오류본문>(res: APIResponse): Promise<T> {
  return (await res.json()) as T;
}

const 꼬리 = (): string => `${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;

export function 새아이디(앞머리: string): string {
  return `${앞머리}${꼬리()}`.slice(0, 16);
}

export function 새이름(): string {
  return `q${꼬리()}${Math.random().toString(36).slice(2, 5)}`.slice(0, 12);
}

export function 새비밀번호(): string {
  return `p${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function 인증머리(누구: { 토큰: string }): Record<string, string> {
  return { Authorization: `Bearer ${누구.토큰}` };
}

export function 머리(누구: 캐릭터): Record<string, string> {
  return { Authorization: `Bearer ${누구.토큰}`, 'X-Character-Id': String(누구.번호) };
}

export async function 가입(요청: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return 요청.post('/auth/signup', { data: { username: 아이디, password: 비밀번호 } });
}

export async function 로그인(요청: APIRequestContext, 아이디: string, 비밀번호: string): Promise<토큰> {
  return 본문<토큰>(await 요청.post('/auth/login', { data: { username: 아이디, password: 비밀번호 } }), '로그인');
}

export async function 새계정(요청: APIRequestContext, 앞머리: string): Promise<계정> {
  const 아이디 = 새아이디(앞머리);
  const 비밀번호 = 새비밀번호();
  await 본문<{ accountId: number }>(await 가입(요청, 아이디, 비밀번호), '가입');
  const 받은 = await 로그인(요청, 아이디, 비밀번호);
  return { 아이디, 비밀번호, 토큰: 받은.accessToken, 리프레시: 받은.refreshToken };
}

export async function 캐릭터만들기(요청: APIRequestContext, 누구: 계정, 직업값: 직업 = 'Warrior'): Promise<캐릭터> {
  const 이름 = 새이름();
  const 만든 = await 본문<캐릭터정보>(
    await 요청.post('/characters', { headers: 인증머리(누구), data: { name: 이름, classType: 직업값, gender: 'Male' } }),
    '캐릭터 만들기',
  );
  return { ...누구, 번호: 만든.id, 이름 };
}

export function 찾기(가방값: 가방, templateId: string): 아이템 | undefined {
  return 가방값.items.find((i) => i.templateId === templateId);
}

export function 개수(가방값: 가방, templateId: string): number {
  return 가방값.items.filter((i) => i.templateId === templateId).reduce((합, i) => 합 + i.quantity, 0);
}

export async function 캐릭터정보받기(요청: APIRequestContext, 누구: { 번호: number; 토큰: string }): Promise<캐릭터정보> {
  return 본문(await 요청.get(`/characters/${String(누구.번호)}`, { headers: 인증머리(누구) }), '캐릭터 정보');
}

export async function 가방받기(요청: APIRequestContext, 누구: { 번호: number; 토큰: string }): Promise<가방> {
  return 본문(await 요청.get(`/characters/${String(누구.번호)}/inventory`, { headers: 인증머리(누구) }), '가방 받기');
}

export async function 장착하기(요청: APIRequestContext, 누구: { 번호: number; 토큰: string }, 아이템번호: number): Promise<APIResponse> {
  return 요청.post(`/characters/${String(누구.번호)}/equip`, { headers: 인증머리(누구), data: { itemId: 아이템번호 } });
}

export async function 해제하기(요청: APIRequestContext, 누구: { 번호: number; 토큰: string }, 아이템번호: number): Promise<APIResponse> {
  return 요청.post(`/characters/${String(누구.번호)}/unequip`, { headers: 인증머리(누구), data: { itemId: 아이템번호 } });
}
