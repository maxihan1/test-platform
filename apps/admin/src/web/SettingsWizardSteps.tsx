// 설정 마법사의 단계 목록과 단계마다 오른쪽 칸 — 틀(SettingsWizard.tsx)이 300줄에 닿지 않게 뗐다 (도메인/인증 §8.8 「새로 만들기 마법사」)
// 글은 2026-10-23 사용자가 「쉬운 말로」 고친 시안 그대로다. 칸 이름은 설정 화면과 같게 둔다 — 만든 뒤 설정을 열어도 같은 말이 보이게

import type { ReactNode } from 'react';

import type { SettingsProject, SettingsServiceRow, 앱종류 } from './api.js';
import { 아이콘 } from './icons.js';
import { use말, use언어 } from './i18n.js';
import { 종류, 종류이름, 종류차례 } from './kind.js';
import { CrawlExcludeField } from './SettingsCrawlExclude.js';
import { EnvEditor, type 줄 } from './SettingsEnvs.js';
import { 피그마설정주소 } from './settingsView.js';

export type 단계 = 'project' | 'kind' | 'basic' | 'envs' | 'apidoc' | 'extra' | 'confirm';

/** 마법사가 모으는 값. 비밀값(웹훅 · 피그마)은 빈 글자면 안 보낸다 */
export interface 마법사값 {
  프로젝트이름: string;
  projectId: number | null;
  kind: 앱종류 | null;
  prefix: string;
  name: string;
  testsDir: string;
  testsRepo: string;
  envs: 줄[];
  apiDocPath: string;
  apiDocEnv: string;
  webhook: string;
  figma: string;
  제외: string;
}

export type 값고침 = (일부: Partial<마법사값>) => void;

/** API 문서는 API 종류만 있는 단계다. 종류를 고르기 전에는 빠진 채로 센다 */
export const 단계들 = (kind: 앱종류 | null): 단계[] => ['project', 'kind', 'basic', 'envs', ...(kind === 'API' ? (['apidoc'] as const) : []), 'extra', 'confirm'];

export const 단계이름: Record<단계, string> = {
  project: '프로젝트',
  kind: '종류',
  basic: '이름 · 번호',
  envs: '대상 서버',
  apidoc: 'API 문서',
  extra: '알림 · 작성 도구',
  confirm: '확인',
};

const 제목들: Record<단계, readonly [string, string]> = {
  project: ['새 프로젝트를 만듭니다', '먼저 프로젝트 이름을 정하고, 이어서 그 안에 들어갈 첫 애플리케이션을 설정합니다'],
  kind: ['무엇을 테스트할지 고릅니다', '고른 종류에 맞춰 테스트를 만들고 실행하는 방법이 정해집니다'],
  basic: ['이름과 번호를 정합니다', '화면에 보일 이름과 테스트 번호 앞에 붙을 약자를 적습니다'],
  envs: ['테스트할 서버 주소를 넣습니다', '실행할 때 이 목록에서 서버를 고릅니다. 지금 없으면 나중에 넣어도 됩니다'],
  apidoc: ['API 문서 위치를 적습니다', 'API 목록이 적힌 Swagger 문서를 어디서 받는지 알려 줍니다'],
  extra: ['알림과 작성 도구를 연결합니다', '모두 선택입니다. 지금 건너뛰고 나중에 설정에서 넣어도 됩니다'],
  confirm: ['이대로 만듭니다', '고칠 것이 있으면 줄 끝의 「고치기」를 누릅니다'],
};

/** 애플리케이션만 더할 때의 첫 단계는 고르기다 */
export const 단계제목 = (st: 단계, 새프로젝트: boolean): readonly [string, string] =>
  st === 'project' && !새프로젝트 ? ['애플리케이션을 넣을 프로젝트를 고릅니다', '지금 보던 프로젝트를 먼저 골라 두었습니다'] : 제목들[st];

export const 서버들 = (v: 마법사값): string[] => v.envs.map((it) => it.env).filter((env) => env !== '');

/** 다 한 단계 · 고른 카드 · 끝 화면의 체크. 처음 그려질 때 한 번 그어진다(그려짐) */
export const 체크그림 = (
  <svg className="wz-check" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={100} />
  </svg>
);

/** 오른쪽 칸 — 단계마다 다른 칸을 그린다. 대상 서버 줄은 설정 화면의 편집기를 그대로 쓴다(검사 규칙이 갈리지 않게) */
export function 단계칸(p: {
  단계: 단계;
  값: 마법사값;
  고친다: 값고침;
  새프로젝트: boolean;
  만든프로젝트: boolean;
  projects: SettingsProject[];
  services: SettingsServiceRow[];
  고치러: (st: 단계) => void;
}) {
  const t = use말();
  const { 값, 고친다 } = p;
  const 칸 = (id: string, 이름: string, 안: ReactNode, 도움: string) => (
    <div className="field">
      <label htmlFor={id}>{이름}</label>
      <div>
        {안}
        <div className="hint">{도움}</div>
      </div>
    </div>
  );

  switch (p.단계) {
    case 'project':
      if (p.새프로젝트) {
        return 칸(
          'wz-project',
          t('프로젝트 이름'),
          <input id="wz-project" type="text" autoComplete="off" value={값.프로젝트이름} disabled={p.만든프로젝트}
            placeholder={t('예: 우리 쇼핑몰')} onChange={(e) => 고친다({ 프로젝트이름: e.target.value })} />,
          p.만든프로젝트
            ? t('프로젝트는 이미 만들었습니다. 이름은 나중에 프로젝트 설정에서 바꿉니다')
            : t('회사나 제품 이름을 그대로 쓰면 나중에 찾기 쉽습니다'),
        );
      }
      return (
        <div className="wz-picks" role="group" aria-label={t('프로젝트§칸')}>
          {p.projects.map((it) => {
            const 안의것 = p.services.filter((s) => s.projectId === it.id);
            return (
              <button key={it.id} type="button" className="wz-pick" aria-pressed={값.projectId === it.id} onClick={() => 고친다({ projectId: it.id })}>
                <span>
                  <strong>{it.name}</strong>
                  <small>{안의것.length === 0 ? t('아직 애플리케이션이 없습니다') : 안의것.map((s) => s.name).join(' · ')}</small>
                </span>
                <small>{t('애플리케이션 {수}개', { 수: 안의것.length })}</small>
              </button>
            );
          })}
        </div>
      );
    case 'kind':
      return (
        <div className="wz-kinds" role="group" aria-label={t('종류')}>
          {종류차례.map((k) => {
            const 줄 = 종류(k);
            return (
              <button key={k} type="button" className="wz-kind" aria-pressed={값.kind === k} onClick={() => 고친다({ kind: k })}>
                <span className="wz-kind-h">
                  {/* 웹은 헤더에서 아이콘을 안 달지만 카드는 넷이 나란히라 모양을 맞춘다 */}
                  <아이콘 이름={줄.아이콘 ?? 'desktop'} />
                  {t(줄.이름)}
                </span>
                <p>{t(줄.소개.한줄)}</p>
                <span className="wz-eg">{t('예: {예}', { 예: t(줄.소개.예) })}</span>
                <span className="wz-what">{t(줄.소개.확인)}</span>
                <span className="wz-eg">{t(줄.소개.성능)}</span>
                <span className="wz-tick">{체크그림}</span>
              </button>
            );
          })}
        </div>
      );
    case 'basic': {
      // 테스트 폴더를 손대지 않았으면 접두사를 소문자로 따라 적는다 — 둘은 거의 늘 같다
      const 따라감 = 값.testsDir === '' || 값.testsDir === 값.prefix.toLowerCase();
      return (
        <>
          {칸('wz-prefix', t('접두사'),
            <input id="wz-prefix" type="text" autoComplete="off" value={값.prefix} placeholder="PAY" maxLength={12}
              onChange={(e) => {
                const prefix = e.target.value.toUpperCase();
                고친다({ prefix, ...(따라감 ? { testsDir: prefix.toLowerCase() } : {}) });
              }} />,
            t('테스트 번호 앞에 붙는 영문 약자입니다. 소문자로 쳐도 대문자로 바뀝니다'))}
          {칸('wz-name', t('이름'),
            <input id="wz-name" type="text" autoComplete="off" value={값.name} placeholder={t('예: 결제 서비스')} onChange={(e) => 고친다({ name: e.target.value })} />,
            t('메뉴와 맨 위 고르개에 보이는 이름입니다'))}
          {칸('wz-dir', t('테스트 폴더'),
            <input id="wz-dir" type="text" autoComplete="off" value={값.testsDir} placeholder="pay" onChange={(e) => 고친다({ testsDir: e.target.value })} />,
            t('자동화 스크립트를 모아 둘 폴더 이름입니다. 접두사를 적으면 미리 채워 둡니다'))}
          {칸('wz-repo', t('테스트 저장소'),
            <input id="wz-repo" type="text" autoComplete="off" value={값.testsRepo} placeholder="https://github.com/..." onChange={(e) => 고친다({ testsRepo: e.target.value })} />,
            t('AI 가 만든 테스트를 올릴 GitHub 저장소 주소입니다. 비워 두면 만든 테스트를 반영할 수 없습니다'))}
        </>
      );
    }
    case 'envs':
      return <EnvEditor envs={값.envs} onChange={(envs) => 고친다({ envs })} api={값.kind === 'API'} 게임={값.kind === 'GAME'} />;
    case 'apidoc':
      return (
        <>
          {칸('wz-apidoc', t('문서 경로'),
            <input id="wz-apidoc" type="text" autoComplete="off" value={값.apiDocPath} placeholder="/openapi.json" onChange={(e) => 고친다({ apiDocPath: e.target.value })} />,
            t('기준 서버 주소 뒤에 붙여 문서를 받아 옵니다'))}
          {칸('wz-apienv', t('기준 서버'),
            <select id="wz-apienv" value={값.apiDocEnv} onChange={(e) => 고친다({ apiDocEnv: e.target.value })}>
              <option value="">{t('고르지 않음')}</option>
              {서버들(값).map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>,
            t('문서를 받아 올 서버입니다. 앞 단계에서 넣은 서버 중에서 고릅니다'))}
        </>
      );
    case 'extra':
      return (
        <>
          {/* 비밀값이라 글자를 가린다. 자동완성을 끈다 — 브라우저가 이 관리 화면의 로그인 비밀번호를 채워 넣으면 그것이 저장된다 */}
          {칸('wz-hook', t('Slack 웹훅'),
            <input id="wz-hook" type="password" autoComplete="new-password" value={값.webhook} placeholder="https://hooks.slack.com/..." onChange={(e) => 고친다({ webhook: e.target.value })} />,
            t('테스트가 끝나면 결과를 보낼 Slack 채널의 웹훅 주소입니다'))}
          <div className="field">
            <label htmlFor="wz-figma">{t('피그마 토큰')}</label>
            <div>
              <input id="wz-figma" type="password" autoComplete="new-password" value={값.figma} placeholder="figd_..." onChange={(e) => 고친다({ figma: e.target.value })} />
              <div className="hint">
                {t('Figma 에서 Settings → Security → Personal access tokens 로 만듭니다. 읽기 전용이면 됩니다')}{' '}
                <a href={피그마설정주소} target="_blank" rel="noopener noreferrer">
                  {t('Figma 설정 열기')} ↗
                </a>
              </div>
            </div>
          </div>
          {/* 탐색은 크롤러가 웹만 한다 — 다른 종류에는 쓸 데가 없어 안 보인다 (도메인/러너 §5.2 종류 표) */}
          {종류(값.kind ?? undefined).대조 ? <CrawlExcludeField 값={값.제외} 바꾼다={(제외) => 고친다({ 제외 })} /> : null}
        </>
      );
    case 'confirm':
      return <확인표 값={값} 새프로젝트={p.새프로젝트} projects={p.projects} 고치러={p.고치러} />;
  }
}

/** 확인 단계 — 고른 것을 줄마다 보이고 줄 끝 「고치기」로 그 단계에 돌아간다. 비밀값은 넣었는지만 보인다 */
function 확인표(p: { 값: 마법사값; 새프로젝트: boolean; projects: SettingsProject[]; 고치러: (st: 단계) => void }) {
  const t = use말();
  const 언어 = use언어();
  const { 값 } = p;
  const 제외수 = 값.제외.split('\n').filter((it) => it.trim() !== '').length;
  const 붙인것 = [
    값.webhook === '' ? null : t('Slack 웹훅'),
    값.figma === '' ? null : t('피그마 토큰'),
    제외수 === 0 ? null : t('탐색 제외 경로 {수}줄', { 수: 제외수 }),
  ].filter((it) => it !== null);
  const 줄 = (st: 단계, 내용: ReactNode) => (
    <div key={st}>
      <span className="wz-sum-k">{t(단계이름[st])}</span>
      <span className="wz-sum-v">{내용}</span>
      <button type="button" className="btn ghost small" aria-label={t('{이름} 고치기', { 이름: t(단계이름[st]) })} onClick={() => p.고치러(st)}>
        {t('고치기')}
      </button>
    </div>
  );
  return (
    <div className="wz-sum">
      {줄('project', p.새프로젝트 ? (
        <>
          {값.프로젝트이름.trim()} <span className="wz-badge">{t('새로 만듭니다')}</span>
        </>
      ) : (p.projects.find((it) => it.id === 값.projectId)?.name ?? ''))}
      {줄('kind', 값.kind === null ? '' : 종류이름(값.kind, 언어))}
      {줄('basic', (
        <>
          {값.name} · <span className="mono">{값.prefix}-001</span>
          <br />
          {t('테스트 폴더')} <span className="mono">{값.testsDir}</span>
          {값.testsRepo === '' ? null : <><br />{값.testsRepo}</>}
        </>
      ))}
      {줄('envs', 값.envs.length === 0 ? t('없음 — 나중에 설정에서 넣습니다') : 값.envs.map((it) => (
        <span key={it.key} className="wz-sum-line">
          <span className="mono">{it.env}</span> {it.baseUrl}
          {(it.isProd ?? false) ? <span className="wz-badge">{t('실서비스 서버')}</span> : null}
        </span>
      )))}
      {값.kind === 'API' ? 줄('apidoc', (
        <>
          <span className="mono">{값.apiDocPath === '' ? t('비워 둠') : 값.apiDocPath}</span> · {t('기준 서버')} {값.apiDocEnv === '' ? t('고르지 않음') : 값.apiDocEnv}
        </>
      )) : null}
      {줄('extra', 붙인것.length === 0 ? t('건너뜀') : 붙인것.join(' · '))}
    </div>
  );
}
