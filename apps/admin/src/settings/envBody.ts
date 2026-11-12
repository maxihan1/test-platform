// 설정 API 가 받는 대상 서버 줄(envs[]) — 줄 모양 · 이름 겹침 · 역할 이름 · 게임 줄의 앱 파일 값을 본다 (SPEC 도메인/인증 §7 「envs[] 한 줄」)

import { 앱파일값인가, 패키지이름인가 } from '@platform/kit/protocol';
import { z } from 'zod';

import { API인증줄, 어드민키줄 } from './apiService.js';
import { 준비줄 } from './prep.js';
import { 역할까닭찾기 } from './roles.js';

// 테스트 계정 칸은 키가 없으면 기존 값을 유지하고 null·빈 글자면 지운다. 역할 계정 · 운영 서버 표시도 키가 없으면 유지한다
// (SPEC 도메인/인증 §7 「envs[] 한 줄」). 역할 이름 규칙은 스키마 밖 roles.ts 에서 본다 — 어기면 400 BAD_ROLE 이다
const 역할계정 = z.object({
  role: z.string(),
  loginId: z.string().nullable().optional(),
  loginPassword: z.string().nullable().optional(),
});

const 대상서버 = z.object({
  env: z.string().min(1),
  baseUrl: z.string().min(1),
  loginId: z.string().nullable().optional(),
  loginPassword: z.string().nullable().optional(),
  isProd: z.boolean().optional(),
  accounts: z.array(역할계정).optional(),
  // Appium 이 도는 PC(팜 PC)의 apk 경로나 http(s) 주소다. 있는지는 안 본다(Appium 이 그 항목의 실패 사유로 말한다).
  // http(s) 밖의 주소(file:// 등)는 막는다 — 그 PC 의 아무 파일이나 폰에 깔게 된다 (APP-F1-03 · APP-F1-10)
  appPath: z.string().max(1000).refine(앱파일값인가, 'appPath 는 파일 경로나 http(s) 주소여야 합니다').nullable().optional(),
  apiAuths: z.array(API인증줄).optional(),
  adminKey: 어드민키줄.nullable().optional(),
  // 실행 전 준비 주소 — 모든 종류가 받는다. 칸 규칙은 prep.ts 준비틀림(400 BAD_PREP), 이어받기 · 실서비스 거절은 저장(envs.ts)이 본다
  prep: 준비줄.nullable().optional(),
});

// 게임은 SDK 를 넣은 QA 빌드(APK)라야 돈다 — 같은 칸이 받는 스토어 앱 패키지 이름은 게임 줄에서 막는다 (러너 §5.2 「플레이스토어 앱 — 패키지 이름」)
export const 게임패키지 = (kind: string, envs: { appPath?: string | null }[] | undefined): boolean =>
  kind === 'GAME' && (envs ?? []).some((e) => typeof e.appPath === 'string' && 패키지이름인가(e.appPath.trim()));
export const 게임패키지거절 = { error: 'INVALID_REQUEST', detail: 'appPath 는 게임 애플리케이션에서 패키지 이름을 받지 않습니다 — SDK 를 넣은 APK 경로나 http(s) 주소여야 합니다' };

// 이름이 키다 — 겹치면 둘째 줄 INSERT 가 기본 키에 걸려 500 이 된다
export const 대상서버목록 = z.array(대상서버).refine((envs) => new Set(envs.map((e) => e.env)).size === envs.length, 'envs 의 env 이름이 겹칩니다');

// 한 줄이라도 어긋나면 저장 전체를 막는다. 어느 줄인지는 싣지 않는다 — 화면이 보내기 전에 같은 규칙으로 짚는다
export const 역할틀림 = (envs: { accounts?: { role: string }[] }[] | undefined): boolean =>
  (envs ?? []).some((e) => e.accounts !== undefined && 역할까닭찾기(e.accounts.map((a) => a.role)) !== null);
