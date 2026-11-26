// 게임 배우기의 타입과 작은 글 · 셈 — 세션 재료 · 손 · 이어 돌릴 때 주는 글 · 맡은 요구 번호 (authoring-learn 이 300줄을 넘지 않게 떼어 냈다)
import type { 띄운결과 } from './authoring-explore.js';
import type { 돌린결과 } from './authoring-io.js';
import type { 배울것 } from './authoring-learn-map.js';
import type { 화면통로 } from './authoring-screens-keep-io.js';

export type 한번결과 = { 돌린것: 돌린결과; 크레딧으로: boolean; 앞낸것: string | null };

/** 세션 하나에 주는 재료 — 프롬프트는 부르는 쪽이 짓는다(authoring-learn-prompt) */
export type 세션거리 =
  /** 멈춤 — 앞 세션이 조작 도우미 `--freeze` 로 판을 멈춘 채 끝났다(authoring-game-freeze) */
  | { 시험: true; 남은분: number; 빌드?: string; 놓음: boolean; 멈춤?: true }
  /** 틀림 — 시험에서 틀린 줄만 다시 배운다 */
  /** 쪽지 — 앞 AI 가 지도에 남긴 말(authoring-game-tree `쪽지열쇠`) · 트리 — 열린 물음이 어디서 나왔나(authoring-game-tree) · 인수 — 기계가 모은 인수인계(authoring-learn-handoff) */
  /** 단계 — 게임 배우기가 끝나 곳마다 깨 보는 중(authoring-learn-io 학습상태) */
  | { 시험?: undefined; 배울것: 배울것; 남은분: number; 빌드?: string; 놓음: boolean; 못올림: string[]; 부분: boolean; 차례: number; 단계?: '게임플레이'; 틀림?: true; 쪽지?: string; 트리?: readonly string[]; 인수?: readonly string[]; 멈춤?: true };

export interface 학습손 {
  통로: 화면통로;
  자료: string;
  비밀: readonly string[];
  /** 이어 작성 · 반영이면 맡은 요구 번호 — 그 요구에 닿는 줄만 30분 한 세션 */
  번호들?: readonly string[];
  /** 디바이스를 잡을 길이 없으면 까닭 — 학습을 안 한다 */
  못함: string | null;
  빌드: () => Promise<string | undefined>;
  프롬프트: (거리: 세션거리) => string;
  /** 글은 띄울 때마다 짓는다 — 크레딧이 도중에 떨어져 구독으로 이어 띄우면 쥔 디바이스가 첫 자식 때와 다르다. 이어서 — 방금 끝난 대화를 이어 돌린다(`--continue`) */
  한번: (글짓기: () => string, 끊기: AbortSignal, 먹기: (줄: string) => void, 이어서?: boolean) => Promise<한번결과>;
  /** 앞 작성이 배운 조작 도우미를 트리에 가져온다 — 처음 배울 때 한 번만 부른다 */
  도우미가져오기: () => void;
  /** 앞 자식이 남긴 프로세스를 거둔다 — 디바이스는 쥔 채다 */
  거두기: () => Promise<boolean>;
  늘리기: () => () => void;
  /** 지금 디바이스를 쥐고 있나(잡기 기록) */
  쥐었나: () => boolean;
  놓기: () => Promise<void>;
  /** 디바이스를 기다리는 정식 실행이 있나 — 있으면 다음 세션 앞에서 놓는다 */
  양보: () => Promise<boolean>;
  /** 비켜 준 뒤 다시 빌 때까지 기다린다 — 거짓이면 안 비었다 */
  빈것기다리기: () => Promise<boolean>;
  멈추라했다: () => boolean;
  알린다: (글: string) => void;
  지금?: () => number;
}

export interface 학습결과 {
  /** 있으면 작성을 이것으로 끝낸다(사람 멈춤 · 끊김 · 못 띄움) — 폴더가 남아 이어하기가 학습부터 잇는다 */
  끝?: 띄운결과;
  /** 학습 자식들의 출력 — 토큰을 다 더해 알린다 */
  앞낸것: string[];
}

/** 앞에 돈 학습 자식이 있는데 다음 자식이 못 떴다 — 실패로 끝내면 배운 폴더와 토큰을 잃어 끊김(코드 1)으로 바꾼다(탐색 세션과 같다) */
export const 못뜬것은끊김 = (돌린것: 돌린결과, 앞낸것: readonly string[]): 돌린결과 =>
  앞낸것.length > 0 && 돌린것.코드 === null && !돌린것.시간초과 && !돌린것.멈춤으로죽음 ? { ...돌린것, 코드: 1 } : 돌린것;

/** AI 가 스스로 끝낸 세션을 이어 돌릴 때 주는 글 — 끝은 에이전트가 정한다. 놀이 — 게임플레이 단계 */
export const 이음글 = (남은것: readonly string[], 놀이 = false): string =>
  `아직 끝이 아니다 — ${놀이 ? '게임플레이' : '배우기'}를 끝내는 것은 에이전트가 정한다. 남은 것: ${남은것.join(' · ')}. ${놀이 ? '하던 곳에서 이어 깬다(회고를 적고 그 곳 맵 정보를 쓴 계획을 새로 적는다)' : '하던 데서 이어 배운다(열린 물음을 풀고, 나아감 숫자를 올리거나 아직 안 간 곳을 가 본다)'}. 정리하라는 알림(※ 줄)이 올 때만 쪽지를 고쳐 쓰고 끝낸다.`;

export interface 학습대상 {
  반영?: { 다시씀: readonly { 번호: string }[]; 새항목: readonly string[] };
  이어작성?: { 남은: readonly string[] };
}

/** 이어 작성 · 반영이 맡은 요구 번호 — 첫 작성 · 대조 · 화면만은 undefined(전체를 배운다) */
export const 학습번호들 = (x: 학습대상): string[] | undefined =>
  x.반영 !== undefined ? [...x.반영.다시씀.map((y) => y.번호), ...x.반영.새항목] : x.이어작성 !== undefined ? [...x.이어작성.남은] : undefined;
