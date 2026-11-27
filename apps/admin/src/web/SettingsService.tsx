// 설정 화면의 애플리케이션 하나 (SPEC §8.8). 탭 넷 — 기본 정보 · 실행 · 테스트 작성 · 알림 · 연동
// 지우지 않는다 — 비활성으로 내릴 뿐이다. 지우면 그 서비스로 돌린 과거 증적이 흔들린다

import { useState } from 'react';

import { 어드민키종류인가 } from '../settings/roles.js';

import { api, ApiError, type SettingsServiceRow } from './api.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { 떠나기상자 } from './leaveGuard.js';
import { type 서비스탭, 서비스못보내는이유, 설정오류문장, 제외경로값, 탭상태 } from './settingsView.js';
import { 어드민키못보내는이유 } from './SettingsAdminKey.js';
import { 준비못보내는이유 } from './SettingsPrep.js';
import { API인증못보내는이유 } from './SettingsApiAuths.js';
import { API문서못보내는이유 } from './SettingsApiService.js';
import { 보낼모양, 줄로, type 줄 } from './SettingsEnvs.js';
import { 저장줄, 탭속 } from './SettingsServiceTabs.js';
import { SettingsTabs } from './SettingsTabs.js';
import { message } from './ui.js';

/**
 * 고른 애플리케이션 하나의 설정 — 탭마다 「어디에 쓰이나」를 한 줄로 단다 (2026-10-09 시안 A · 탭은 2026-11-27 시안 A).
 * 앞 판은 목록 줄을 펴면 칸 열 개가 한 줄로 이어져 무슨 설정인지 안 읽혔다(2026-10-07 사용자).
 * 새로 만드는 일은 마법사(SettingsWizard.tsx)가 한다 — 이 칸은 고치기만 한다 (2026-10-23 사용자)
 *
 * 입력 상태는 이 컴포넌트 한 곳이 쥔다 — 탭을 오가도 적은 것이 남고, 저장은 모든 탭의 변경을 한 번에 보낸다
 *
 * @param onDone 저장했거나(저장 true) 활성만 뒤집었다(false). 접두사를 넘긴다
 * @param 저장했다 방금 저장해 새로 읽은 칸이다. 저장 단추 곁에 「저장했습니다」를 보인다
 * @param 탭 · on탭 지금 탭은 위(Settings)가 기억한다. 저장하면 이 패널이 다시 그려져서, 안 그러면 보던 탭에서 기본 정보로 튄다. 안 주면 이 안에서 쥔다
 */
type Props = {
  row: SettingsServiceRow;
  onDone: (접두사: string, 저장: boolean) => void;
  저장했다?: boolean;
  탭?: 서비스탭;
  on탭?: (탭: 서비스탭) => void;
};

const 탭이름: [서비스탭, string][] = [
  ['basic', '기본 정보'],
  ['run', '실행'],
  ['author', '테스트 작성'],
  ['link', '알림 · 연동'],
];

export function ServicePanel({ row, onDone, 저장했다 = false, 탭: 위탭, on탭: on위탭 }: Props) {
  const t = use말();
  // 아래 판단은 순수 모듈에 있어 훅을 못 쓴다. 언어를 여기서 꺼내 넘긴다
  const 언어 = use언어();
  const [안탭, set안탭] = useState<서비스탭>('basic');
  const 탭 = 위탭 ?? 안탭;
  const 탭고르기 = on위탭 ?? set안탭;
  const [name, setName] = useState(row.name);
  const [testsRepo, setTestsRepo] = useState(row.testsRepo);
  const [testsDir, setTestsDir] = useState(row.testsDir);
  const [envs, setEnvs] = useState<줄[]>(() => 줄로(row.envs));
  // 받은 행에 종류가 없으면 이 칸 전에 만든 화면 애플리케이션이다. 종류는 만든 뒤 못 바꾼다(서버 400 KIND_IMMUTABLE)
  const kind = row.kind ?? 'SCREEN';
  const [apiDocPath, setApiDocPath] = useState(row.apiDocPath ?? '');
  const [apiDocEnv, setApiDocEnv] = useState(row.apiDocEnv ?? '');
  const API종류 = kind === 'API';
  const 어드민키종류 = 어드민키종류인가(kind);
  const [제외, set제외] = useState((row.crawlExclude ?? []).join('\n'));
  const 프로시저종류 = kind === 'APP' || kind === 'GAME';
  const 처음프로시저 = row.procedureMode ?? false;
  const [프로시저, set프로시저] = useState(처음프로시저);
  // 빈 글자와 「안 건드림」은 다르다. null 이면 서버에 아예 안 보낸다 (지금 것을 그대로 둔다)
  const [webhook, setWebhook] = useState<string | null>(null);
  const [figma, setFigma] = useState<string | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 적다 만 것이 있으면 설정 메뉴 · 다른 화면으로 떠나기 전에 묻는다(점검 14.1). 처음 그린 값과 견준다.
  // 탭마다 따로 재서 「저장 안 한 변경」 점을 단다 — 어느 탭에 적다 만 것이 있는지 탭 이름 옆에서 보인다
  const 탭칸 = {
    basic: JSON.stringify({ name, testsRepo, testsDir }),
    run: JSON.stringify({ envs }),
    author: JSON.stringify({ 제외, figma, apiDocPath, apiDocEnv, 프로시저 }),
    link: JSON.stringify({ webhook }),
  } satisfies Record<서비스탭, string>;
  const 지금칸 = JSON.stringify(탭칸);
  const [처음탭칸] = useState(탭칸);
  const [처음칸] = useState(지금칸);
  // 저장한 칸. 칸이 새로 읽은 값으로 다시 그려지기 전에도(다시 읽기 실패 포함) 저장한 것을 두고는 묻지 않는다
  const [보낸칸, set보낸칸] = useState<string | null>(null);
  const 저장안함 = 지금칸 !== 처음칸 && 지금칸 !== 보낸칸;

  // 지금 입력 중인 값이다. 비밀값은 안 만졌으면(null) 저장된 것, 만졌으면 적은 것이 있느냐다
  const 입력 = {
    testsRepo,
    envs,
    피그마있나: figma === null ? (row.hasFigmaToken ?? false) : figma !== '',
    웹훅있나: webhook === null ? row.hasSlackWebhook : webhook !== '',
  };

  const 서버들 = envs.map((it) => it.env).filter((env) => env !== '');
  const 못보내는이유 =
    서비스못보내는이유({ 새것: false, prefix: row.prefix, name, testsDir, envs, 제외 }, 언어) ??
    (API종류 ? (API문서못보내는이유({ 경로: apiDocPath, 기준: apiDocEnv, 서버들 }, 언어) ?? API인증못보내는이유(envs, 언어)) : null) ??
    (어드민키종류 ? 어드민키못보내는이유(envs, 언어) : null) ??
    준비못보내는이유(envs, 언어);

  async function 보낸다() {
    if (못보내는이유 !== null) return;
    set보내는중(true);
    setErr(null);
    try {
      // API 칸은 API 종류만 보낸다 — 화면 종류가 보내면 서버가 400 NOT_API_SERVICE 를 낸다
      const API칸 = API종류 ? { apiDocPath: apiDocPath === '' ? null : apiDocPath, apiDocEnv: apiDocEnv === '' ? null : apiDocEnv } : {};
      // 접두사 · 종류는 안 보낸다. 보내면 서버가 400 PREFIX_IMMUTABLE · KIND_IMMUTABLE 을 낸다 (SPEC §8.8)
      await api.updateService(row.id, {
        name,
        testsRepo,
        testsDir,
        envs: 보낼모양(envs, API종류, 어드민키종류),
        crawlExclude: 제외경로값(제외),
        ...API칸,
        ...(webhook === null ? {} : { slackWebhook: webhook }),
        ...(figma === null ? {} : { figmaToken: figma }),
        ...(프로시저종류 && 프로시저 !== 처음프로시저 ? { procedureMode: 프로시저 } : {}),
      });
      set보낸칸(지금칸);
      onDone(row.prefix, true);
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  /** 활성 여부만 뒤집는다. 확인은 활성구획이 묻는다 */
  async function 활성을뒤집는다() {
    set보내는중(true);
    setErr(null);
    try {
      await api.updateService(row.id, { isActive: !row.isActive });
      onDone(row.prefix, false);
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  const 탭들 = 탭이름.map(([값, 이름]) => ({
    값,
    이름: t(이름),
    상태: 탭상태(값, 입력, 언어),
    바뀜: 저장안함 && 탭칸[값] !== 처음탭칸[값],
  }));

  // JSX 안에 풀어 쓰면 `=> void …` 와 `<` 사이의 한글을 messages.test 가 화면 글자로 읽는다
  const 저장 = <저장줄 저장했다={저장했다} 보내는중={보내는중} 못보내는이유={못보내는이유} err={err} on저장={() => void 보낸다()} />;
  const 속값 = {
    row, kind, 어드민키종류, name, setName, testsDir, setTestsDir, testsRepo, setTestsRepo, envs, setEnvs,
    apiDocPath, setApiDocPath, apiDocEnv, setApiDocEnv, 제외, set제외, 프로시저, set프로시저, webhook, setWebhook, figma, setFigma,
    입력, 보내는중, on뒤집기: () => void 활성을뒤집는다(), 저장,
  };

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">
        {row.name}
        <span className="set-sub">{row.prefix}-</span>
        {row.isActive ? null : <span className="set-off">{t('비활성')}</span>}
        <span className="set-sub">{t('케이스 {건수}건', { 건수: row.caseCount })}</span>
      </h2>

      <SettingsTabs 이름={t('애플리케이션 설정')} 아이디="sv" 탭들={탭들} 고른={탭} 이동={(값) => 탭고르기(값 as 서비스탭)}>
        {탭속(탭, 속값)}
      </SettingsTabs>
      <떠나기상자 막나={저장안함} />
    </div>
  );
}

/** `type="color"` 는 여섯 자리 16진수만 받는다. 타이핑 중인 값을 그대로 주면 검정으로 튄다 */
/** 서버가 코드를 주면 사람 말로, 아니면 원문 그대로. 한 화면 안에서 말투가 갈리지 않게 한자리에 둔다 */
export function 오류문장(e: unknown, 언어: 언어): string {
  if (!(e instanceof ApiError)) return message(e, 언어);
  // `INVALID_REQUEST` 일 때 서버가 어느 칸인지 짚어 준다. 그 값은 message 에 들어 있다
  const 짚어준것 = e.code === 'INVALID_REQUEST' ? e.message : undefined;
  return 설정오류문장(e.code, 언어, 짚어준것);
}
