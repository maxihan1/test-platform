// 설정의 「+ 프로젝트 추가」 · 「+ 애플리케이션 추가」 마법사 — 화면 전체를 덮고 한 단계씩 넘기며 프로젝트와 애플리케이션을 만든다 (도메인/인증 §8.8 「새로 만들기 마법사」 · 2026-10-23 사용자 시안 C)
// 서버 약속은 그대로다 — 프로젝트를 먼저 만들고(POST /api/settings/projects) 애플리케이션을 만든다(POST /api/settings/services)

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type SettingsProject, type SettingsServiceRow } from './api.js';
import { t as 말, use말, use언어, type 언어 } from './i18n.js';
import { 떠나기상자 } from './leaveGuard.js';
import { 상자열렸나, 포커스가능 } from './Modal.js';
import { 어드민키못보내는이유 } from './SettingsAdminKey.js';
import { API인증못보내는이유 } from './SettingsApiAuths.js';
import { API문서못보내는이유 } from './SettingsApiService.js';
import { 보낼모양 } from './SettingsEnvs.js';
import { 오류문장 } from './SettingsService.js';
import { 단계설명, 완료칸 } from './SettingsWizardHelp.js';
import { 단계들, 단계이름, 단계제목, 단계칸, 서버들, 쓰는제외, 체크그림, type 단계, type 마법사값 } from './SettingsWizardSteps.js';
import { 서비스못보내는이유, 설정오류문장, 안쓰는서비스색, 제외경로값 } from './settingsView.js';
import { 기다림글자 } from './ui.js';

const 처음값 = (projectId: number | null): 마법사값 => ({
  프로젝트이름: '', projectId, kind: null, prefix: '', name: '', testsDir: '', testsRepo: '', envs: [], apiDocPath: '', apiDocEnv: '', webhook: '', figma: '', 제외: '',
});

/**
 * 「다음」을 막는 까닭. 서버가 400 으로 막을 것을 그 칸이 있는 단계에서 먼저 짚는다 — 끝에서 한꺼번에 말하면 어느 단계를 고칠지 모른다
 * @param 쓰는것 이미 있는 접두사와 그 애플리케이션 이름. 서버는 409 PREFIX_TAKEN 으로만 답해 누가 쓰는지 모른다
 */
export function 막는이유(st: 단계, v: 마법사값, 새프로젝트: boolean, 쓰는것: ReadonlyMap<string, string>, 언어: 언어): string | null {
  switch (st) {
    case 'project':
      if (새프로젝트) return v.프로젝트이름.trim() === '' ? 말('프로젝트 이름을 입력해 주세요', 언어) : null;
      return v.projectId === null ? 말('프로젝트를 골라 주세요', 언어) : null;
    case 'kind':
      return v.kind === null ? 말('무엇을 테스트할지 하나 골라 주세요', 언어) : null;
    case 'basic': {
      // 접두사 · 이름 · 폴더는 설정 화면과 같은 검사다. 대상 서버 · 탐색 제외 경로는 뒤 단계라 비워 넘긴다
      const 쓰는곳 = 쓰는것.get(v.prefix);
      return (
        서비스못보내는이유({ 새것: true, prefix: v.prefix, name: v.name, testsDir: v.testsDir, envs: [], 제외: '' }, 언어) ??
        (쓰는곳 === undefined ? null : 말('이미 「{이름}」에서 쓰는 접두사입니다. 다른 접두사를 적어 주세요', 언어, { 이름: 쓰는곳 }))
      );
    }
    case 'envs':
      // 설정 화면과 같은 검사다. 앞 단계 칸(이름 · 폴더)은 이미 통과했고 탐색 제외 경로는 뒤 단계라 비워 넘긴다
      return (
        서비스못보내는이유({ 새것: false, prefix: v.prefix, name: v.name, testsDir: v.testsDir, envs: v.envs, 제외: '' }, 언어) ??
        (v.kind === 'API' ? API인증못보내는이유(v.envs, 언어) : null) ??
        (v.kind === 'GAME' ? 어드민키못보내는이유(v.envs, 언어) : null)
      );
    case 'apidoc':
      return API문서못보내는이유({ 경로: v.apiDocPath, 기준: v.apiDocEnv, 서버들: 서버들(v) }, 언어);
    case 'extra':
      return 서비스못보내는이유({ 새것: false, prefix: v.prefix, name: v.name, testsDir: v.testsDir, envs: v.envs, 제외: 쓰는제외(v) }, 언어);
    case 'confirm':
      return null;
  }
}

interface Props {
  /** 프로젝트부터 만든다. 처음 그릴 때만 본다 — 만드는 중에 목록을 다시 읽어 프로젝트가 생겨도 마법사가 바뀌지 않게 */
  새프로젝트: boolean;
  projects: SettingsProject[];
  services: SettingsServiceRow[];
  /** 애플리케이션만 더할 때 미리 고를 프로젝트 — 맨 위 헤더에서 보던 애플리케이션이 든 프로젝트 */
  기본프로젝트?: number | undefined;
  /** 「나가기」가 갈 설정 주소 */
  나가는곳: string;
  /** 서버에 무엇이든 만들었다. 설정이 목록과 맨 위 재료를 다시 읽는다 — 옮겨 가지는 않는다, 끝 화면이 다음 할 일을 고르게 한다 */
  on만듦: () => void;
  /** 만든 애플리케이션이 맨 위 고르개에 있나 — 나에게 배정된 프로젝트일 때만이다. 맨 위 재료를 다시 읽은 뒤에 참이 된다 */
  고를수있나: (serviceId: number) => boolean;
  /** 그 프로젝트가 나에게 배정돼 있나 — 아니면 다시 읽어도 고르개에 안 나와 끝 화면이 배정하는 길을 알린다 */
  내프로젝트: (projectId: number) => boolean;
  on작성: (serviceId: number) => void;
  on설정: (prefix: string) => void;
}

export function SettingsWizard(p: Props) {
  const t = use말();
  const 언어 = use언어();
  const [새프로젝트] = useState(p.새프로젝트);
  const [값, set값] = useState(() => 처음값(새프로젝트 ? null : (p.기본프로젝트 ?? p.projects[0]?.id ?? null)));
  const [처음] = useState(() => JSON.stringify(값));
  const [지금, set지금] = useState(0);
  const [방향, set방향] = useState<'fwd' | 'back' | null>(null);
  const [이유, set이유] = useState<string | null>(null);
  // 같은 까닭으로 또 막혀도 다시 흔들리게 열쇠를 바꾼다
  const [흔들, set흔들] = useState(0);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [만든프로젝트, set만든프로젝트] = useState<number | null>(null);
  const [만든것, set만든것] = useState<{ id: number; prefix: string; name: string } | null>(null);
  const 본문 = useRef<HTMLDivElement>(null);
  const 틀 = useRef<HTMLDivElement>(null);

  const 목록 = 단계들(값.kind);
  const st = 목록[Math.min(지금, 목록.length - 1)]!;
  const 쓰는것 = new Map(p.services.map((it) => [it.prefix, it.name]));
  const 고른프로젝트 = p.projects.find((it) => it.id === 값.projectId);
  const 제목 = 새프로젝트 ? t('새 프로젝트') : t('새 애플리케이션');

  // 단계가 바뀌면 그 단계 첫 칸에 손이 간다 — 키보드로 넘기는 사람이 칸을 찾아 헤매지 않게
  useEffect(() => {
    본문.current?.querySelector<HTMLElement>('input:not(:disabled), select, textarea, [aria-pressed]')?.focus({ preventScroll: true });
  }, [지금]);

  // 화면 전체를 덮는 창이라 키보드가 뒤 화면(설정 메뉴 · 머리)으로 새지 않게 가둔다. Esc 는 「나가기」다 —
  // 떠나기 확인 상자가 떠 있으면 그 상자가 Esc · Tab 을 맡는다
  useEffect(() => {
    function 눌림(e: KeyboardEvent) {
      if (상자열렸나()) return;
      if (e.key === 'Escape') {
        window.location.hash = p.나가는곳;
        return;
      }
      if (e.key !== 'Tab') return;
      const 것들 = [...(틀.current?.querySelectorAll<HTMLElement>(포커스가능) ?? [])];
      const 처음 = 것들[0];
      const 끝 = 것들[것들.length - 1];
      if (처음 === undefined || 끝 === undefined) return;
      if (!e.shiftKey && document.activeElement === 끝) {
        e.preventDefault();
        처음.focus();
      } else if (e.shiftKey && document.activeElement === 처음) {
        e.preventDefault();
        끝.focus();
      }
    }
    document.addEventListener('keydown', 눌림);
    return () => document.removeEventListener('keydown', 눌림);
  }, [p.나가는곳]);

  const 고친다 = (일부: Partial<마법사값>) => {
    set값((앞) => ({ ...앞, ...일부 }));
    set이유(null);
  };
  const 간다 = (i: number, 쪽: 'fwd' | 'back') => {
    set지금(i);
    set방향(쪽);
    set이유(null);
    setErr(null);
  };
  const 막혔다 = (까닭: string) => {
    set이유(까닭);
    set흔들((n) => n + 1);
  };

  function 다음() {
    const 까닭 = 막는이유(st, 값, 새프로젝트, 쓰는것, 언어);
    if (까닭 !== null) return 막혔다(까닭);
    if (st === 'confirm') return void 만든다();
    간다(지금 + 1, 'fwd');
  }

  async function 만든다() {
    // 「고치기」로 앞 단계를 바꿨을 수 있다 — 막힌 단계가 있으면 그리로 데려간다
    const 막힌 = 목록.find((it) => 막는이유(it, 값, 새프로젝트, 쓰는것, 언어) !== null);
    if (막힌 !== undefined) {
      간다(목록.indexOf(막힌), 'back');
      막혔다(막는이유(막힌, 값, 새프로젝트, 쓰는것, 언어)!);
      return;
    }
    if (값.kind === null) return;
    set보내는중(true);
    setErr(null);
    let 이번에만듦 = false;
    try {
      // 앞에서 프로젝트만 만들고 애플리케이션이 실패했으면 다시 만들지 않는다 — 같은 이름 프로젝트가 둘 생긴다
      let projectId = 새프로젝트 ? 만든프로젝트 : 값.projectId;
      if (projectId === null) {
        projectId = (await api.createProject(값.프로젝트이름.trim())).id;
        set만든프로젝트(projectId);
        이번에만듦 = true;
      }
      const API종류 = 값.kind === 'API';
      const { id } = await api.createService({
        projectId,
        prefix: 값.prefix,
        kind: 값.kind,
        color: 안쓰는서비스색,
        name: 값.name,
        testsRepo: 값.testsRepo,
        testsDir: 값.testsDir,
        envs: 보낼모양(값.envs, API종류, 값.kind === 'GAME'),
        crawlExclude: 제외경로값(쓰는제외(값)),
        // API 칸은 API 종류만 보낸다 — 다른 종류가 보내면 서버가 400 NOT_API_SERVICE 를 낸다
        ...(API종류 ? { apiDocPath: 값.apiDocPath === '' ? null : 값.apiDocPath, apiDocEnv: 값.apiDocEnv === '' ? null : 값.apiDocEnv } : {}),
        ...(값.webhook === '' ? {} : { slackWebhook: 값.webhook }),
        ...(값.figma === '' ? {} : { figmaToken: 값.figma }),
      });
      set만든것({ id, prefix: 값.prefix, name: 값.name });
      p.on만듦();
    } catch (e) {
      // 프로젝트는 생겼으니 설정 메뉴에 보이게 다시 읽는다
      if (이번에만듦) p.on만듦();
      // 그사이 다른 사람이 같은 접두사를 썼으면 그 칸이 있는 단계로 데려간다
      if (e instanceof ApiError && (e.code === 'PREFIX_TAKEN' || e.code === 'PREFIX_SHAPE')) {
        간다(목록.indexOf('basic'), 'back');
        막혔다(설정오류문장(e.code, 언어));
      } else {
        setErr(오류문장(e, 언어));
      }
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div ref={틀} className="wz" role="dialog" aria-modal="true" aria-label={제목}>
      <aside className="wz-rail">
        <p className="wz-brand">{제목}</p>
        <ol className="wz-steps">
          {목록.map((it, i) => {
            const 다함 = 만든것 !== null || i < 지금;
            return (
              <li key={it} className={다함 ? 'done' : i === 지금 ? 'now' : undefined} aria-current={i === 지금 && 만든것 === null ? 'step' : undefined}>
                {/* 지나온 단계는 눌러 돌아간다. 앞 단계는 차례대로만 간다 — 건너뛰면 검사를 안 거친다 */}
                <button type="button" className="wz-stepbtn" disabled={만든것 !== null || 보내는중 || i >= 지금} onClick={() => 간다(i, 'back')}>
                  <span className="wz-dot">{다함 ? 체크그림 : i + 1}</span>
                  {t(단계이름[it])}
                </button>
                {i === 지금 && 만든것 === null ? (
                  <단계설명 단계={it} 값={값} 새프로젝트={새프로젝트} 만든프로젝트={만든프로젝트 !== null}
                    프로젝트={고른프로젝트 === undefined ? null : { name: 고른프로젝트.name, 앱들: p.services.filter((s) => s.projectId === 고른프로젝트.id).map((s) => s.name) }} />
                ) : null}
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="wz-main">
        <div className="wz-top">
          <span>
            {t('설정')} › {제목}
          </span>
          <a className="btn ghost" href={p.나가는곳}>
            {만든것 === null ? t('나가기') : t('닫기')}
          </a>
        </div>
        {만든것 !== null ? (
          <완료칸
            이름={만든것.name}
            프로젝트이름={새프로젝트 ? 값.프로젝트이름.trim() : null}
            작성갈수={p.고를수있나(만든것.id)}
            // 새 프로젝트는 서버가 만든 사람에게 배정한다(§7). 고른 프로젝트는 지금 배정을 본다
            배정안됨={!새프로젝트 && 값.projectId !== null && !p.내프로젝트(값.projectId)}
            on작성={() => p.on작성(만든것.id)}
            on설정={() => p.on설정(만든것.prefix)}
          />
        ) : (
          // 단계마다 열쇠가 달라 새로 그려진다 — 그때 넘긴 쪽에서 미끄러져 들어온다
          <div key={지금} ref={본문} className={방향 === null ? 'wz-step' : `wz-step ${방향}`}>
            <h2 className="wz-h">{t(단계제목(st, 새프로젝트)[0])}</h2>
            <p className="wz-sub">{t(단계제목(st, 새프로젝트)[1])}</p>
            <div className="wz-form">
              <단계칸 단계={st} 값={값} 고친다={고친다} 새프로젝트={새프로젝트} 만든프로젝트={만든프로젝트 !== null}
                projects={p.projects} services={p.services} 고치러={(it) => 간다(목록.indexOf(it), 'back')} 잠김={보내는중} />
            </div>
            {err === null ? null : <div className="err">{err}</div>}
            <div className="wz-foot">
              <span key={흔들} className={이유 === null ? 'hint wz-why' : 'err wz-why wz-shake'} role={이유 === null ? undefined : 'alert'}>
                {이유 ?? (st === 'extra' ? t('건너뛰려면 비워 두고 「다음」을 누릅니다') : '')}
              </span>
              {지금 > 0 ? (
                <button type="button" className="btn ghost" disabled={보내는중} onClick={() => 간다(지금 - 1, 'back')}>
                  {t('이전')}
                </button>
              ) : null}
              <button type="button" className="btn" disabled={보내는중} onClick={다음}>
                {st === 'confirm' ? <기다림글자 중={보내는중} 평소={t('만들기')} 기다림={t('만드는 중…')} /> : t('다음')}
              </button>
            </div>
          </div>
        )}
      </div>
      <떠나기상자 막나={만든것 === null && JSON.stringify(값) !== 처음} />
    </div>
  );
}
