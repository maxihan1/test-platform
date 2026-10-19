// 설정 화면의 서비스 하나 (SPEC §8.8). 기본 정보 · 대상 서버 · 정기 실행 · 실행 알림 · 테스트 작성 · 화면 크기 · 서비스 비활성화 구획
// 지우지 않는다 — 비활성으로 내릴 뿐이다. 지우면 그 서비스로 돌린 과거 증적이 흔들린다

import { useState } from 'react';

import { api, ApiError, type ScheduleSetting, type SettingsServiceRow } from './api.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { 떠나기상자 } from './leaveGuard.js';
import {
  안쓰는서비스색,
  서비스못보내는이유,
  설정오류문장,
  접두사사유,
  제외경로값,
  피그마설정주소,
} from './settingsView.js';
import { CrawlExcludeField } from './SettingsCrawlExclude.js';
import { EnvEditor, 보낼모양, 줄로, type 줄 } from './SettingsEnvs.js';
import { ScheduleFields } from './SettingsSchedule.js';
import { 구획, 비밀칸 } from './SettingsServiceParts.js';
import { ViewportSection } from './SettingsViewport.js';
import { message } from './ui.js';

/**
 * 고른 서비스 하나의 설정 — 구획마다 「어디에 쓰이나」를 한 줄로 단다 (2026-10-09 시안 A).
 * 앞 판은 목록 줄을 펴면 칸 열 개가 한 줄로 이어져 무슨 설정인지 안 읽혔다(2026-10-07 사용자)
 *
 * @param onDone 저장했다. 접두사를 넘긴다 — 새로 만들었으면 그 서비스로 옮겨 간다
 * @param 저장했다 방금 저장해 새로 읽은 칸이다. 저장 단추 곁에 「저장했습니다」를 보인다
 */
export function ServicePanel({ row, onDone, 저장했다 = false }: { row?: SettingsServiceRow; onDone: (접두사: string) => void; 저장했다?: boolean }) {
  const t = use말();
  // 아래 판단 넷은 순수 모듈에 있어 훅을 못 쓴다. 언어를 여기서 꺼내 넘긴다
  const 언어 = use언어();
  const 새것 = row === undefined;
  const [prefix, setPrefix] = useState(row?.prefix ?? '');
  const [name, setName] = useState(row?.name ?? '');
  // 화면에서는 뺐다(점검 14.8). 서버가 이 칸을 요구해서 새 서비스는 빈 글자, 고치기는 받은 값을 되돌려 보낸다
  const testsRepo = row?.testsRepo ?? '';
  const [testsDir, setTestsDir] = useState(row?.testsDir ?? '');
  const [envs, setEnvs] = useState<줄[]>(() => 줄로(row?.envs ?? []));
  const [제외, set제외] = useState((row?.crawlExclude ?? []).join('\n'));
  // 빈 글자와 「안 건드림」은 다르다. null 이면 서버에 아예 안 보낸다 (지금 것을 그대로 둔다)
  const [webhook, setWebhook] = useState<string | null>(새것 ? '' : null);
  const [figma, setFigma] = useState<string | null>(새것 ? '' : null);
  const [schedule, setSchedule] = useState<ScheduleSetting | null>(row?.schedule ?? null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [비활성확인, set비활성확인] = useState(false);
  // 적다 만 것이 있으면 설정 메뉴 · 다른 화면으로 떠나기 전에 묻는다(점검 14.1). 처음 그린 값과 견준다
  const 지금칸 = JSON.stringify({ prefix, name, testsDir, envs, 제외, webhook, figma, schedule });
  const [처음칸] = useState(지금칸);
  // 저장한 칸. 칸이 새로 읽은 값으로 다시 그려지기 전에도(다시 읽기 실패 포함) 저장한 것을 두고는 묻지 않는다
  const [보낸칸, set보낸칸] = useState<string | null>(null);

  const 접두사틀림 = 접두사사유(prefix, 언어);
  const 못보내는이유 = 서비스못보내는이유({ 새것, prefix, name, testsDir, envs, 제외, 정기실행: 새것 ? undefined : schedule }, 언어);

  async function 보낸다() {
    if (못보내는이유 !== null) return;
    set보내는중(true);
    setErr(null);
    try {
      const 같은칸 = { name, testsRepo, testsDir, envs: 보낼모양(envs), crawlExclude: 제외경로값(제외) };
      if (새것) {
        await api.createService({
          prefix,
          color: 안쓰는서비스색,
          ...같은칸,
          ...(webhook === null || webhook === '' ? {} : { slackWebhook: webhook }),
          ...(figma === null || figma === '' ? {} : { figmaToken: figma }),
        });
      } else {
        // 접두사는 안 보낸다. 보내면 서버가 400 PREFIX_IMMUTABLE 을 낸다 (SPEC §8.8)
        // 정기 실행은 고쳤을 때만 보낸다 — 「안 보내면 그대로」라 그사이 다른 사람이 바꾼 것을 덮지 않는다
        const 정기바뀜 = JSON.stringify(schedule) !== JSON.stringify(row.schedule ?? null);
        await api.updateService(row.id, {
          ...같은칸,
          ...(webhook === null ? {} : { slackWebhook: webhook }),
          ...(figma === null ? {} : { figmaToken: figma }),
          ...(정기바뀜 ? { schedule } : {}),
        });
      }
      set보낸칸(지금칸);
      onDone(prefix);
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  /** 활성 여부만 뒤집는다. 내릴 때는 확인을 한 번 거친다 */
  async function 활성을뒤집는다() {
    if (row === undefined) return;
    set비활성확인(false);
    set보내는중(true);
    setErr(null);
    try {
      await api.updateService(row.id, { isActive: !row.isActive });
      onDone(row.prefix);
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">
        {새것 ? (
          t('새 서비스')
        ) : (
          <>
            {row.name}
            <span className="set-sub">{row.prefix}-</span>
            {row.isActive ? null : <span className="set-off">{t('비활성')}</span>}
            <span className="set-sub">{t('케이스 {건수}건', { 건수: row.caseCount })}</span>
          </>
        )}
      </h2>

      <구획 제목={t('기본 정보')} 쓰임={t('케이스 번호, 서비스 선택 목록, 스크립트 폴더에 사용되는 정보입니다')}>
        <div className="field">
          <label htmlFor="sf-prefix">{t('접두사')}</label>
          <div>
            <input
              id="sf-prefix"
              type="text"
              value={prefix}
              disabled={!새것}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="PAY"
            />
            <div className="hint">
              {새것
                ? t('생성할 때만 정할 수 있습니다. 케이스 번호(PAY-001)에 사용되므로 나중에 바꿀 수 없습니다')
                : t('생성 후에는 바꿀 수 없습니다. 케이스 번호에 이미 사용 중입니다')}
            </div>
            {접두사틀림 === null ? null : <div className="err">{접두사틀림}</div>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="sf-name">{t('이름')}</label>
          <input
            id="sf-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('결제 서비스')}
          />
        </div>

        <div className="field">
          <label htmlFor="sf-dir">{t('테스트 폴더')}</label>
          <div>
            <input
              id="sf-dir"
              type="text"
              value={testsDir}
              onChange={(e) => setTestsDir(e.target.value)}
              placeholder="pay"
            />
            <div className="hint">{t('플랫폼이 테스트 스크립트를 읽어 오는 폴더입니다')}</div>
          </div>
        </div>
      </구획>

      <구획 제목={t('대상 서버')} 쓰임={t('테스트를 실행할 서버 목록입니다. 하나 이상 등록해야 실행할 수 있습니다')}>
        <EnvEditor envs={envs} onChange={setEnvs} 접두사={row?.prefix} />
      </구획>

      {/* 새 서비스에는 없다 — 케이스가 없는 서비스라 돌릴 것이 없다 (도메인/인증 §8.8) */}
      {새것 ? null : (
        <구획 제목={t('정기 실행')} 쓰임={t('매일 정한 시각에 이 서비스의 스크립트를 자동으로 한 번 실행합니다. 대시보드의 통과율과 일별 결과는 이 실행을 바탕으로 집계됩니다')}>
          <ScheduleFields
            값={schedule}
            저장된={row.schedule ?? null}
            바꾼다={setSchedule}
            대상서버들={envs.map((it) => it.env).filter((env) => env !== '')}
            마지막={row.lastScheduled ?? null}
          />
        </구획>
      )}

      <구획 제목={t('실행 알림')} 쓰임={t('실행할 때 「끝나면 Slack으로 알리기」를 켜면 이 채널로 결과를 보냅니다')}>
        <비밀칸 id="sf-hook" 이름={t('Slack 웹훅')} 설정됨={row?.hasSlackWebhook ?? false} 새것={새것}
          값={webhook} 바꾼다={setWebhook} placeholder="https://hooks.slack.com/..."
          비울때={t('이대로 저장하면 알림이 꺼집니다. 유지하려면 「변경 취소」를 누릅니다')} />
      </구획>

      <구획 제목={t('테스트 작성')} 쓰임={t('기획서와 피그마로 테스트 스크립트를 만들 때만 사용합니다. 실행에는 영향을 주지 않습니다')}>
        {/* 규칙은 웹훅과 같다. 발급 안내를 옆에 둔다 — 어디서 만드는지 모르면 칸이 비어 남는다 (도메인/인증 §8.8) */}
        <비밀칸 id="sf-figma" 이름={t('피그마 토큰')} 설정됨={row?.hasFigmaToken ?? false} 새것={새것}
          값={figma} 바꾼다={setFigma} placeholder="figd_..."
          비울때={t('이대로 저장하면 토큰이 삭제되어 피그마 자료를 읽을 수 없게 됩니다')}>
          <div className="hint">
            {t('Figma의 Settings → Security → Personal access tokens에서 발급합니다. 권한은 File content 읽기 전용으로 하고 만료일을 지정합니다')}{' '}
            <a href={피그마설정주소} target="_blank" rel="noopener noreferrer">
              {t('Figma 설정 열기')} ↗
            </a>
          </div>
        </비밀칸>
        <CrawlExcludeField 값={제외} 바꾼다={set제외} />
      </구획>

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {저장했다 ? <span className="hint set-saved" role="status">{t('저장했습니다')}</span> : null}
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        <button className="btn" disabled={보내는중} onClick={() => void 보낸다()}>
          {새것 ? t('서비스 추가') : t('저장')}
        </button>
      </div>
      {못보내는이유 === null ? null : <div className="hint set-why">{못보내는이유}</div>}

      {새것 ? null : (
        <구획 제목={t('화면 크기')} 쓰임={t('테스트 작성이 화면을 PC 와 모바일로 열어 본 결과입니다. 새 케이스를 PC 로만 만들지 모바일도 같이 만들지 이 판정으로 정합니다')}>
          <ViewportSection serviceId={row.id} envs={row.envs} />
        </구획>
      )}

      {/* 저장과 다른 일이라 따로 둔다 — 적다 만 칸은 저장하지 않고 상태만 뒤집는다 */}
      {새것 ? null : (
        <구획 제목={t('서비스 비활성화')} 쓰임={t('비활성화하면 서비스 선택 목록에서 사라집니다. 실행 기록과 스크립트는 그대로 보관됩니다')} 경고>
          {비활성확인 && row.isActive ? (
            // 결과를 먼저 말하고 확정은 글자가 다른 따로 된 버튼으로 둔다 — SettingsPending.tsx 의 거절 확인과 같은 모양
            <div className="set-warn">
              {t('서비스 선택 목록에서 사라집니다. 실행 기록과 케이스는 그대로 보관됩니다')}{' '}
              <button className="btn ghost set-warn" disabled={보내는중} onClick={() => void 활성을뒤집는다()}>
                {t('비활성화한다')}
              </button>{' '}
              <button className="btn ghost" disabled={보내는중} onClick={() => set비활성확인(false)}>
                {t('그만두기')}
              </button>
            </div>
          ) : (
            <div>
              <button
                className="btn ghost"
                disabled={보내는중}
                onClick={() => (row.isActive ? set비활성확인(true) : void 활성을뒤집는다())}
              >
                {row.isActive ? t('비활성화') : t('다시 활성화')}
              </button>
            </div>
          )}
        </구획>
      )}
      <떠나기상자 막나={지금칸 !== 처음칸 && 지금칸 !== 보낸칸} />
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
