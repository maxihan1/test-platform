import type { 튜토리얼화면 } from './tutorial.helper.js';

export interface 튜토리얼걸음 {
  본것: 튜토리얼화면;
  뒤: 튜토리얼화면;
}

export interface 단계기대 {
  카드: string[];
  과제: string[];
  키: [string, string][];
}

const 고르게 = (글: string): string => 글.replace(/\s+/g, ' ').trim();

function 키맞나(본키: string[], [이름, 키]: [string, string]): boolean {
  return 본키.some((줄) => (키 === '방향키' ? 줄 === 이름 || 줄.startsWith(`${이름} `) : 고르게(줄) === `${이름} ${키}`));
}

export function 단계를봤나(기록: 튜토리얼걸음[], 기대: 단계기대): boolean {
  const 화면들 = 기록.flatMap((걸음) => [걸음.본것, 걸음.뒤]);
  const 카드 = 기대.카드.every((글) => 화면들.some((화면) => 고르게(화면.카드본문) === 고르게(글)));
  const 과제 = 기대.과제.every((글) => 화면들.some((화면) => 고르게(화면.과제) === 고르게(글)));
  const 키 = 기대.키.every((짝) => 화면들.some((화면) => 키맞나(화면.키, 짝)));
  return 카드 && 과제 && 키;
}

export function 카드다음카드(기록: 튜토리얼걸음[], 과제글: string, 다음카드글: string): boolean {
  const 화면들 = 기록.flatMap((걸음) => [걸음.본것, 걸음.뒤]);
  const 과제자리 = 화면들.findIndex((화면) => 고르게(화면.과제).includes(과제글));
  if (과제자리 < 0) return false;
  const 다음카드 = 화면들.slice(과제자리 + 1).find((화면) => 화면.카드본문 !== '');
  return 다음카드 !== undefined && 고르게(다음카드.카드본문) === 고르게(다음카드글);
}

export function 본단계수(기록: 튜토리얼걸음[]): number {
  return new Set(기록.map((걸음) => `${걸음.뒤.카드}|${걸음.뒤.카드본문}|${걸음.뒤.과제}`)).size;
}

export function 기록줄(기록: 튜토리얼걸음[]): string {
  return 기록.map((걸음) => `${걸음.본것.카드 || '과제'} ${걸음.본것.카드본문 || 걸음.본것.과제} [${걸음.본것.키.join(', ')}]`).join(' / ');
}
