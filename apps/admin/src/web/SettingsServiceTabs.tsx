// 애플리케이션 설정의 탭 넷 속 — 기본 정보 · 실행 · 테스트 작성 · 알림 · 연동. 입력 상태는 ServicePanel 이 쥐고 여기는 그리기만 한다 (SPEC §8.8)

import type { ReactNode } from 'react';

import type { SettingsServiceRow } from './api.js';
import { BTS이름 } from './btsName.js';
import { use말, use언어 } from './i18n.js';
import { type 서비스탭, type 탭입력, 탭필요한것, 피그마설정주소 } from './settingsView.js';
import { API문서구획, 종류칸 } from './SettingsApiService.js';
import { CI토큰구획 } from './SettingsCiTokens.js';
import { CrawlExcludeField } from './SettingsCrawlExclude.js';
import { EnvEditor, type 줄 } from './SettingsEnvs.js';
import { 서비스저장단추, 활성구획 } from './SettingsServiceConfirm.js';
import { 구획, 비밀칸, 접두사칸, 프로젝트칸 } from './SettingsServiceParts.js';
import { 필요한것상자 } from './SettingsTabs.js';
import { ViewportSection } from './SettingsViewport.js';

/**
 * 입력이 있는 탭의 저장 줄. 저장은 모든 탭의 변경을 한 번에 보낸다.
 * @param 같이저장 지금 탭 밖에서 바뀐 탭 이름들. 다른 탭에서 걸어 둔 삭제(웹훅 비우기 등)가 말없이 같이 나가지 않게 이름을 보인다
 * @param 막힌탭 못 보내는 이유가 다른 탭 칸에 있을 때 그 탭으로 가는 길. 이유만 보이면 그 칸이 안 보여 찾지 못한다
 */
export function 저장줄(p: {
  저장했다: boolean; 보내는중: boolean; 못보내는이유: string | null; err: string | null; on저장: () => void;
  같이저장: string[]; 막힌탭: { 이름: string; 이동: () => void } | null;
}) {
  const t = use말();
  return (
    <>
      {p.err === null ? null : <div className="err">{p.err}</div>}
      <div className="set-foot">
        {p.저장했다 ? <span className="hint set-saved" role="status">{t('저장했습니다')}</span> : null}
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        <서비스저장단추 보내는중={p.보내는중} 못보낸다={p.못보내는이유 !== null} on저장={p.on저장} />
      </div>
      {p.같이저장.length === 0 ? null : <div className="hint set-why">{t('다른 탭의 변경도 같이 저장됩니다 · {탭들}', { 탭들: p.같이저장.join(' · ') })}</div>}
      {p.못보내는이유 === null ? null : (
        <div className="hint set-why">
          {p.못보내는이유}
          {p.막힌탭 === null ? null : (
            <>
              {' '}
              <button type="button" className="btn ghost small" onClick={p.막힌탭.이동}>{t('{탭} 탭에서 확인', { 탭: p.막힌탭.이름 })}</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** 탭 하나가 받는 입력. 바꾸는 길은 ServicePanel 의 set 함수 그대로다 */
export interface 탭속값 {
  row: SettingsServiceRow;
  kind: NonNullable<SettingsServiceRow['kind']>;
  어드민키종류: boolean;
  name: string;
  setName: (v: string) => void;
  testsDir: string;
  setTestsDir: (v: string) => void;
  testsRepo: string;
  setTestsRepo: (v: string) => void;
  envs: 줄[];
  setEnvs: (v: 줄[]) => void;
  apiDocPath: string;
  setApiDocPath: (v: string) => void;
  apiDocEnv: string;
  setApiDocEnv: (v: string) => void;
  제외: string;
  set제외: (v: string) => void;
  프로시저: boolean;
  set프로시저: (v: boolean) => void;
  webhook: string | null;
  setWebhook: (v: string | null) => void;
  figma: string | null;
  setFigma: (v: string | null) => void;
  /** 「필요한 것」이 보는 지금 입력 */
  입력: 탭입력;
  저장: ReactNode;
  보내는중: boolean;
  on뒤집기: () => void;
}

export function 탭속(탭: 서비스탭, p: 탭속값) {
  switch (탭) {
    case 'basic':
      return <기본정보탭 {...p} />;
    case 'run':
      return <실행탭 {...p} />;
    case 'author':
      return <작성탭 {...p} />;
    case 'link':
      return <알림탭 {...p} />;
  }
}

function 기본정보탭(p: 탭속값) {
  const t = use말();
  const { row } = p;
  return (
    <>
      <구획 제목={t('기본 정보')} 쓰임={t('케이스 번호, 애플리케이션 선택 목록, 테스트 폴더에 쓰는 정보입니다')}>
        <프로젝트칸 지금={{ id: row.projectId, name: row.projectName }} />
        <접두사칸 값={row.prefix} />
        <종류칸 값={p.kind} 게임플랫폼={row.gamePlatform} />

        <div className="field">
          <label htmlFor="sf-name">{t('이름')}</label>
          <input id="sf-name" type="text" value={p.name} onChange={(e) => p.setName(e.target.value)} placeholder={t('결제 페이지')} />
        </div>

        <div className="field">
          <label htmlFor="sf-dir">{t('테스트 폴더')}</label>
          <div>
            <input id="sf-dir" type="text" value={p.testsDir} onChange={(e) => p.setTestsDir(e.target.value)} placeholder="pay" />
            <div className="hint">{t('케이스 파일을 읽어 오는 폴더입니다')}</div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="sf-repo">{t('테스트 저장소')}</label>
          <div>
            <input id="sf-repo" type="text" value={p.testsRepo} onChange={(e) => p.setTestsRepo(e.target.value)} placeholder="https://github.com/..." />
            <div className="hint">{t('작성 요청이 등록한 PR 이 이 저장소 것인지 확인하는 데 씁니다. 비워 두면 작성한 케이스를 반영할 수 없습니다')}</div>
          </div>
        </div>
      </구획>
      {/* 저장은 비활성화와 다른 일이라 위에 둔다 — 적다 만 칸은 저장하지 않고 상태만 뒤집는 쪽이 비활성화다 */}
      {p.저장}
      <활성구획 켜짐={row.isActive} 보내는중={p.보내는중} on뒤집기={p.on뒤집기} />
    </>
  );
}

function 실행탭(p: 탭속값) {
  const t = use말();
  const 언어 = use언어();
  return (
    <>
      <필요한것상자 제목={t('실행하려면 필요한 것')} 항목들={탭필요한것('run', p.입력, 언어)} />
      <구획 제목={t('대상 서버§목록')} 쓰임={t('테스트를 실행할 서버 목록입니다. 하나 이상 등록해야 실행할 수 있습니다')}>
        <EnvEditor envs={p.envs} onChange={p.setEnvs} 접두사={p.row.prefix} api={p.kind === 'API'} 어드민키={p.어드민키종류} 스토어앱={p.kind === 'APP'} />
      </구획>
      {p.저장}
    </>
  );
}

function 작성탭(p: 탭속값) {
  const t = use말();
  const 언어 = use언어();
  const 서버들 = p.envs.map((it) => it.env).filter((env) => env !== '');
  const 프로시저종류 = p.kind === 'APP' || p.kind === 'GAME';
  return (
    <>
      <필요한것상자 제목={t('테스트를 작성하려면 필요한 것')} 항목들={탭필요한것('author', p.입력, 언어)} />
      <구획 제목={t('테스트 작성')} 쓰임={t('기획서와 피그마로 케이스를 만들 때만 씁니다. 실행에는 영향을 주지 않습니다')}>
        {/* 규칙은 웹훅과 같다. 발급 안내를 옆에 둔다 — 어디서 만드는지 모르면 칸이 비어 남는다 (도메인/인증 §8.8) */}
        <비밀칸 id="sf-figma" 이름={t('피그마 토큰')} 설정됨={p.row.hasFigmaToken ?? false}
          값={p.figma} 바꾼다={p.setFigma} placeholder="figd_..."
          비울때={t('이대로 저장하면 토큰이 삭제되어 피그마 자료를 읽을 수 없게 됩니다')}>
          <div className="hint">
            {t('Figma의 Settings → Security → Personal access tokens에서 발급합니다. 권한은 File content 읽기 전용으로 하고 만료일을 지정합니다')}{' '}
            <a href={피그마설정주소} target="_blank" rel="noopener noreferrer">
              {t('Figma 설정 열기')} ↗
            </a>
          </div>
        </비밀칸>
        <CrawlExcludeField 값={p.제외} 바꾼다={p.set제외} />
        {프로시저종류 ? (
          <div className="field">
            <label htmlFor="sf-procedure">{t('프로시저 작성')}</label>
            <div>
              <label className="check-inline">
                <input id="sf-procedure" type="checkbox" checked={p.프로시저} onChange={(e) => p.set프로시저(e.target.checked)} />
                {t('테스트 프로시저로 작성')}
              </label>
              <div className="hint">
                {t('켜면 사용 흐름 하나에 케이스 여러 건을 묶어 작성하고 UI 테스트와 기능 테스트를 한 번에 실행합니다. 테스트 프로시저로 작성한 케이스가 있으면 끌 수 없습니다')}
              </div>
            </div>
          </div>
        ) : null}
      </구획>
      {p.kind === 'API' ? <API문서구획 경로={p.apiDocPath} 바꾼경로={p.setApiDocPath} 기준={p.apiDocEnv} 바꾼기준={p.setApiDocEnv} 서버들={서버들} /> : null}
      {/* 읽기만 하는 보고서는 저장 줄 아래에 둔다 — 폼 가운데 있으면 저장 대상처럼 읽힌다(점검 14.8) */}
      {p.저장}
      <구획 제목={t('화면 크기')} 쓰임={t('테스트 작성이 화면을 PC 와 모바일로 열어 본 결과입니다. 새 케이스를 PC 로만 만들지, 모바일도 같이 만들지를 이 판정으로 정합니다')}>
        <ViewportSection serviceId={p.row.id} envs={p.row.envs} />
      </구획>
    </>
  );
}

function 알림탭(p: 탭속값) {
  const t = use말();
  return (
    <>
      <구획 제목={t('실행 알림')} 쓰임={t('실행할 때 「완료 시 Slack 알림」을 켜면 이 채널로 결과를 보냅니다')}>
        <비밀칸 id="sf-hook" 이름={t('Slack 웹훅')} 설정됨={p.row.hasSlackWebhook}
          값={p.webhook} 바꾼다={p.setWebhook} placeholder="https://hooks.slack.com/..."
          비울때={t('이대로 저장하면 알림이 꺼집니다. 유지하려면 「변경 취소」를 누릅니다')} />
      </구획>
      {/* 저장 대상은 웹훅 하나다. 아래 결함 등록(링크) · CI 토큰(누르면 바로 적용)은 저장과 상관없어 저장 줄 아래에 둔다 */}
      {p.저장}
      {/* 연결 상태는 이 화면이 받는 응답에 없어 안 보인다. 연결은 프로젝트마다 하나라 고치는 곳은 프로젝트 설정이다 */}
      <구획 제목={t('결함 등록')} 쓰임={t('실패한 테스트를 {bts} 이슈로 등록합니다. 연결은 프로젝트마다 하나라서 프로젝트 설정에서 변경합니다', { bts: BTS이름 })}>
        <div>
          <a href={`#/settings/project-${p.row.projectId}-bts`}>{t('{프로젝트} 프로젝트 설정에서 보기', { 프로젝트: p.row.projectName })}</a>
        </div>
      </구획>
      <구획 제목={t('CI 토큰')} 쓰임={t('CI 가 새 빌드를 업로드할 때 쓰는 토큰입니다. 빌드가 업로드되면 스모크 테스트부터 자동으로 실행합니다')}>
        <CI토큰구획 row={p.row} />
      </구획>
    </>
  );
}
