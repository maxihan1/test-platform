# 테스트 자동화 플랫폼 — 스펙

> 이 문서는 구현의 **단일 진실 원천(Single Source of Truth)** 이다.
> 여기 적힌 타입·계약·스키마와 다르게 구현하면 병렬 작업이 충돌한다.
> 변경이 필요하면 **구현하지 말고 먼저 이 문서를 고칠 것.**

---

## 1. 제품 정의

QA·개발자·PM이 **테스트 코드를 몰라도** 화면에서 테스트 케이스를 찾아,
입력값을 바꿔 실행하고, 결과를 **명세 기반 문서**로 받을 수 있는 플랫폼.

### 핵심 가치 (구현 우선순위 순)

| # | 가치 | 왜 |
|---|------|-----|
| 1 | 코드 재배포 없이 파라미터·기대값 변경 | 테스트 데이터가 바뀔 때마다 개발자를 부르지 않는다 |
| 2 | 자연어 케이스명으로 검색·실행 | 파일명을 외울 필요가 없다 |
| 3 | 실패 지점을 검증 문장 단위로 표시 | "왜 실패했는지"를 로그 없이 안다 |
| 4 | 명세 기반 증적 문서 자동 생성 | 공공/금융 검수 산출물 공수 제거 |
| 5 | 성공률·소요시간 지표 대시보드 | 자동화 품질 자체를 모니터링 |

### 전제 (2026-09-16 결정)

이 플랫폼은 **실제 서비스에 붙이는 완제품**이다. 데모 규모(케이스 10건, 공개 데모 사이트)는
**테스트 대상에만** 적용되고 플랫폼 설계에는 적용되지 않는다.
"데모니까 이 정도면 된다"는 판단을 설계에 쓰지 않는다.

**서비스마다 인스턴스(instance, 이 플랫폼 한 벌을 통째로 따로 띄운 것)를 따로 띄운다.** DB도 따로다.
그래서 한 인스턴스 안에서는 `tcId`가 여전히 전역 유일이고, 프로젝트·팀·소유자 같은 축이 필요 없다.
인스턴스를 하나 더 만들 때 바꿀 것은 여섯 가지다. → §9.2

**인스턴스를 고르는 화면은 만들지 않는다.** 한 화면이 여러 DB를 넘어다니면
멀티테넌시(multi-tenancy, 한 벌로 여러 서비스를 동시에 감당하는 구조)로 되돌아가고,
케이스 번호 충돌·소유자 축·권한 분리가 줄줄이 따라온다.
대신 지금 보고 있는 것이 **어느 인스턴스인지 구분되게** 만든다. → §8

### 범위 밖 (의도적 제외)

안 하는 것을 **두 갈래로 나눠** 적는다 (2026-09-16 결정). 섞어 적으면 "지금은 안 함"이
읽는 사람 머릿속에서 "영원히 안 함"으로 굳어 버리고, 조건이 와도 아무도 다시 꺼내지 않는다.

#### 지금은 안 하되 조건이 오면 한다

| 안 하는 것 | 지금 안 하는 이유 | 하게 되는 조건 |
|---|---|---|
| 메시지 큐(실행 요청을 줄 세워 두는 중간 창구) / 러너 수평 확장 / S3 업로드 | 전부 **대량 실행 대응** 장치다. 현재 규모(단일 서버, 동시 2)에서는 불필요하다 | 실행 대기 줄이 한 대로 감당이 안 될 때. 붙일 자리는 이음새(seam, 나중에 부품을 갈아 끼울 수 있게 미리 갈라 둔 경계)로 남겨 뒀다 → §5.3 |
| 검색엔진(전용 검색 서버) | 서버 CPU가 2개라 테스트 실행과 자리를 다툰다. 인스턴스마다 하나씩 더 띄워야 하고, 색인(검색용으로 따로 만들어 둔 사본)이 어긋나면 **조용히** 틀린 목록을 보여준다 | 케이스가 수백 건이 되어 DB 검색이 눈에 띄게 느려질 때. 갈아 끼울 전제는 §5.3, 지금 지킬 화면 규칙은 §8.1 |

그 밖에 미뤄 둔 것은 **§1.1**에 "무엇이 생기면 그때"와 함께 적는다.

#### 영구히 하지 않는다

| 안 하는 것 | 왜 |
|---|---|
| Playwright 기본 HTML 리포트 | 러너가 케이스 1건마다 프로세스를 따로 띄우므로 1건짜리 리포트가 N개로 흩어진다. HTML 리포트의 유일한 가치인 "실행 전체 요약"이 아예 성립하지 않는다. 그 역할은 §8.3과 §8.4가 한다 |
| 화면에서 테스트 코드를 작성·편집하는 기능 | §3.1의 "코드가 진실의 원천"과 정면으로 충돌한다. 화면에서 고친 코드와 저장소의 코드가 갈리는 순간 무엇이 진실인지 아무도 모르게 된다 |
| 러너가 DB를 아는 구조 | 이 규칙 하나가 §5.3의 모든 이음새를 떠받친다. 러너가 DB를 알면 컨테이너를 나눈 의미가 사라진다 → §3.4 |
| 프로젝트·팀·소유자 축 | 서비스마다 인스턴스를 따로 띄우고 DB도 따로이므로 한 인스턴스 안에는 갈라야 할 프로젝트가 애초에 없다. 축을 만들면 모든 조회·화면·문서가 그 축을 끌고 다니게 된다 |
| 인스턴스를 고르는 화면 | 한 화면이 여러 DB를 넘어다니면 위의 축들이 전부 되살아난다 → §8 |

**인증은 범위 안이다** (2026-09-16 결정). 실행자가 누구인지 모르면 증적 문서의 실행자 칸이 거짓이 된다.
아이디·비밀번호 로그인 하나만 넣고, 나중에 회사 계정 연동으로 갈아 끼울 수 있게 만든다. → §3.5
권한 구분·팀·승인 절차는 지금 하지 않는다. 자리만 남긴다.

화면은 React + Vite로 빌드한다. 번들러는 대량 실행 대응 장치가 아니라 화면 개발 도구이므로 범위 안이다.
(2026-09-16 결정. 테스트 대상은 데모지만 플랫폼 자체는 완제품이어야 한다.) → §9.1

### 1.1 나중에 하는 것 — 조건이 오면 한다 (2026-09-16 결정)

아래는 **지금 만들지 않는다.** 바로 위의 「영구히 하지 않는다」와 다르다.
위는 영원히 안 하는 것이고, 여기는 **조건이 오면 하는 것**이다.
조건을 적어 두지 않으면 "나중에"는 오지 않는다.

| # | 항목 | 지금 안 하는 이유 | 무엇이 생기면 그때 |
|---|------|-----------------|------------------|
| L1 | 대상 서버 코드 커버리지 (JaCoCo 등) | 계측할 프로세스에 부착 모듈을 달아야 하는데 §10의 대상이 공개 데모 사이트라 우리 것이 아니다 | 테스트 대상이 **우리 서비스**가 되어 소스와 빌드에 손이 닿을 때 |
| L2 | 배포 이벤트 연동 (테스트를 안 돌리고 나간 배포 식별) | 데모 대상에는 우리가 아는 배포가 없다 | 우리 서비스의 배포 파이프라인이 "배포했다"를 이 플랫폼에 알려줄 수 있을 때 |
| L3 | 케이스 사전 등록과 자동화 진척률 | 코드가 진실의 원천이고(§3.1) 코드 밖 케이스 목록이 없다. 분모가 없다 | QA가 관리하는 수동 케이스 목록이 문서로 존재할 때 |
| L4 | 증적 문서 엑셀 양식 | HTML·PDF는 §8.4 모양을 그대로 그리지만 엑셀은 **표**라 계층을 어떻게 펼지 정해진 게 없다. 지어내면 검수처 양식과 안 맞아 두 번 만든다 | **검수처가 주는 양식을 받아 볼 때.** 그 양식에 맞춰 표 모양을 정한다 |
| L5 | Playwright trace(실행을 통째로 녹화해 되감아 보는 기록) 보관 | 1건에 수 MB다. 실패 지점은 스크린샷·절차·검증 문장으로 이미 좁혀진다 | 스크린샷만으로 원인을 못 찾는 실패가 **반복해서** 나올 때. L6과 같이 정한다 |
| L6 | artifacts 보관 기간과 자동 삭제 | 실행량이 적어 아직 차지 않는다. 먼저 지우면 과거 증적의 스크린샷이 사라져 문서가 깨진다 | artifacts 볼륨이 디스크의 절반을 넘을 때. "증적이 참조하는 파일은 지우지 않는다"를 먼저 정한다 |
| L7 | 증적 문서 합치기 (여러 실행을 한 부로) | 지금은 실행 1건 = 문서 1부다 (§8.4) | 검수처가 "여러 회차를 한 부로 묶어 달라"고 실제로 요구할 때 |
| L8 | 실행 완료 알림 (메일·메신저) | 화면 앞에 있는 사람에게는 §8.3의 진행 표시로 충분하다 | 한 실행이 수십 분이 되어 사람이 자리를 뜨게 될 때 |
| L9 | 러너 이미지 재빌드 절차 문서화 | Playwright 버전을 아직 한 번도 올려 본 적이 없다. 안 해 본 절차를 미리 쓰면 틀린 문서가 남는다 | Playwright 버전을 처음 올릴 때. 그때 **실제로 한 순서**를 그대로 적는다 |
| L10 | tcId 도메인별 현황 패널 | 데모 케이스가 전부 `DEMO-` 접두사라 지금 붙이면 표에 한 줄만 뜬다 | 실제 도메인(`AUTH`·`PROD` 등)의 케이스가 생긴 뒤 |
| L11 | 실행 시점의 코드 버전(커밋) 기록 | 컨테이너가 저장소 정보를 들고 있지 않다. 없는 값을 억지로 만들면 증적이 거짓말을 한다 | 배포 파이프라인이 커밋 정보를 설정으로 넣어 줄 때. `test_run`에 한 칸을 더한다 |
| L12 | 한 번에 요청할 수 있는 실행 건수 상한 | 동시 실행 2 제한이 이미 있어 서버가 죽지 않는다. 줄이 길어질 뿐이고, 멈춤 버튼(§8.3)이 있다 | 한 번의 요청이 몇 시간짜리 줄을 만드는 일이 실제로 생길 때 |
| L13 | 여러 인스턴스를 한눈에 보는 화면 | 인스턴스마다 DB가 따로다. 한 화면이 여러 DB를 넘어다니면 접어 둔 멀티테넌시로 되돌아간다. **인스턴스 위에 얹는 상위 도구**라 이 플랫폼의 범위가 아니다 | 인스턴스가 셋을 넘어 "오늘 전부 초록인가"를 창 세 개로 확인하게 될 때. 그때도 이 플랫폼 안이 아니라 바깥 도구로 만든다 |

**L1·L2·L3은 나중에 붙여도 안전하다.** 지금 없다고 해서 과거 기록이 거짓이 되지 않는다.
커버리지는 붙인 시점부터 재면 되고, 배포 연동과 진척률도 마찬가지다.
셋 다 조건이 "대상이 우리 서비스가 되면"이므로 **영구히 안 함이 아니라 조건이 오면 한다**로 남긴다.

이 표는 §5.3과 답하는 질문이 다르다. §5.3은 "붙일 때 코드의 **어디를** 고치나"이고
여기는 "**언제** 붙이나"다.

---

## 2. 유비쿼터스 언어

| 용어 | 코드 식별자 | 정의 |
|------|------------|------|
| 테스트 케이스 | `TestCase` | 코드에 선언된 검증 항목 1건. 명세 그 자체 |
| 케이스 ID | `tcId` | 사람이 부여하고 코드에 적어두는 불변 식별자 (`AUTH-002`) |
| 케이스 명세 | `CaseSpec` | 사전조건 + 이름 + 파라미터 스키마 + 기대결과 스키마 |
| 파라미터 세트 | `ParamSet` | 실행에 주입할 입력값 묶음 (저장 가능) |
| 실행 | `TestRun` | 한 번의 실행 묶음. 화면의 `RUN ID` |
| 실행 항목 | `RunItem` | 실행 안의 케이스 1건 결과. 화면의 `History ID` |
| 스텝 | `Step` | 절차 1단계 |
| 검증 문장 | `Assertion` | 스텝 안의 단언 1개. "응답 코드가 200이다" |
| 디바이스 | `platform` | 실행에 쓰는 기기 종류. `desktop` \| `mobile`. 명세가 아니라 실행의 성질이다 |
| 증적 | `Evidence` | 실행 결과로 생성된 제출용 문서 |
| 대상 서버 | `env` | 이번 실행이 두드린 서버 구분. `dev`·`qa`·`staging` 같은 값. 실행마다 반드시 고르고 기본값을 두지 않는다 |
| 대상 주소 | `baseUrl` | 그 대상 서버의 실제 주소. `env`→주소 대응표는 admin이 설정으로 갖고, 그날 실제로 친 주소를 `test_run`에 박제한다 |
| 비밀값 | `.meta({ secret: true })` | 화면과 증적 문서에 그대로 적으면 안 되는 입력 칸(비밀번호·토큰 등). 케이스 선언의 파라미터 스키마에 이 꼬리표를 단다 |
| 회차 | `attempt` | 같은 실행 안에서 같은 케이스×디바이스를 몇 번째로 돌렸는지. 1부터 센다. 항목 단위 사실이라 `run_item`에 있다 |
| 실행자 | `test_run.triggered_by` · `test_run.triggered_by_name` | 실행 버튼을 누른 사람. 앞은 로그인 계정 아이디, 뒤는 그때의 이름을 박제한 값이다. 둘 다 비어 있을 수 있고, 비면 `실행자 미상 (인증 도입 이전)`으로 쓴다 |
| 인스턴스 이름 | `instanceName` | 이 한 벌을 사람이 부르는 이름. 화면 상단 띠·브라우저 탭 제목·증적 문서 머리말에 그대로 나온다 |
| 인스턴스 색 | `instanceColor` | 인스턴스 이름과 함께 상단 띠에 칠하는 색. 글자를 읽지 않아도 어느 인스턴스인지 구분하려고 둔다 |
| 테스트 저장소 | `repoUrl` | 이 인스턴스가 보는 테스트 코드의 저장소 주소. 설정으로 받아 화면과 증적 문서에 기재만 하고, 플랫폼이 직접 받아오지는 않는다 |

**금지어**: `testId`, `caseId`, `test_case_id` 혼용 금지. **`tcId` 하나만 쓴다.**

### 디바이스와 대상 서버는 다른 축이다 (2026-09-16 결정)

`platform`(디바이스)은 **무엇으로 여는가**이고 — PC 화면인가 휴대폰 화면인가 —
`env`(대상 서버)는 **어디에 붙는가**다 — 개발 서버인가 QA 서버인가.
한 번의 실행에서 디바이스는 케이스마다 여러 개일 수 있지만, 대상 서버는 실행 전체에 하나다.

바꾸는 것은 한글 이름과 화면 라벨뿐이다. 코드 값과 식별자(`platform`·`desktop`·`mobile`)는 그대로 둔다.
Playwright의 projects 이름과 **철자까지 같아야** 러너의 `--project`가 맞기 때문이다 (§10).

### 무엇을 어디에 박제하는가 (2026-09-16 결정)

인스턴스 이름·테스트 저장소·대상 서버·대상 주소·실행자는 **한 번의 실행 전체에 걸린 사실**이다.
항목마다 반복될 값이 아니므로 `test_run`에 박제한다.
`run_item`에는 항목 단위 사실만 남는다 — 라벨(`param_schema`·`expected_schema`) · 회차 · 제한 시간 · 입력값 묶음 · 파일 경로.

인스턴스 이름·색·테스트 저장소를 설정으로 어떻게 받는지는 §9.2에 있다.
`test_run.env`·`base_url`·실행자 칸과 `run_item.attempt`의 계약 변경 보고는 §6이 정본이다. → §6

### tcId 형식

```
<도메인>-<3자리 번호>        AUTH-001   PROD-014   ORDER-003   DEMO-001
```

- 도메인은 대문자 2~6자. 기능 영역을 뜻한다 (`AUTH`, `PROD`, `ORDER`, `CART`)
- 번호는 도메인 안에서 001부터. 한 번 쓴 번호는 케이스를 지워도 재사용하지 않는다
- 화면·문서·검색 어디서든 이 문자열 그대로 쓴다. 접두사나 접미사를 붙이지 않는다

---

## 3. 바운디드 컨텍스트

```
┌──────────────────── admin (컨테이너) ─────────────────────┐
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │  Catalog    │  │  Execution   │  │   Reporting    │    │
│  │  카탈로그    │  │    실행       │  │    리포팅       │    │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
│         │                │                   │            │
└─────────┼────────────────┼───────────────────┼────────────┘
          │                │ HTTP              │
          ▼                ▼                   ▼
    ┌──────────┐   ┌────────────────┐   ┌───────────┐
    │ 소스코드  │   │ runner (컨테이너)│   │ postgres  │
    │ (git 폴더)│   │   Playwright    │   │(컨테이너)  │
    └──────────┘   └────────────────┘   └───────────┘
                                              ▲
                                              │ 읽기 전용
                                         ┌──────────┐
                                         │ grafana  │
                                         └──────────┘
```

### 3.1 Catalog — 무엇을 테스트할 수 있는가

- **책임**: 소스 폴더를 스캔해 `CaseSpec`을 추출하고 검색 가능하게 유지
- **애그리거트 루트**: `TestCase` (식별자 `tcId`)
- **불변식**
  - `tcId`는 전역 유일. 중복 발견 시 스캔 실패시키고 양쪽 파일 경로를 보고한다
  - **코드가 진실의 원천**. DB의 `test_case`는 캐시이며, 스캔 때마다 덮어쓴다
  - 코드에서 사라진 케이스는 삭제하지 않고 `is_active = false`로 둔다 (과거 실행 이력이 참조하므로)
  - **카탈로그는 실행 결과를 알지 못한다.** `test_run`·`run_item`을 읽지 않는다. 목록의 `마지막 결과` 칸은
    실행 컨텍스트가 내는 응답으로 채운다. 이 경계가 무너지면 카탈로그가 실행 테이블 구조에 묶여
    §5.3의 이음새가 같이 무너진다. 검색 조건 다섯과 화면 규칙은 **§8.1이 정본**이다
  - **`test_case`의 `param_schema`·`expected_schema`는 캐시다.** 스캔 때마다 덮어쓰므로 과거 실행의 증적은
    이 테이블을 읽어 만들지 않는다. 증적이 읽을 값은 실행 기록에 따로 박제한다 (§3.3 증적 재현)
  - 나중에 검색엔진을 붙이더라도 옮기는 것은 **케이스 속성뿐**이고 실행 결과는 옮기지 않는다.
    색인해 두면 실행이 끝날 때마다 어긋나고, 어긋난 색인은 조용히 틀린 목록을 보여준다 (→ §5.3)
- **추출 방식** (2026-09-16 결정): 스캐너는 `tests/**/*.spec.ts`를 환경변수 `PLATFORM_SCAN=1`을 켠 채
  동적으로 import 해 `export const spec`을 읽는다. kit의 `test()`는 이 변수가 켜져 있으면 Playwright에
  등록하지 않고 조용히 반환한다. zod 스키마는 실행해야 JSON Schema가 되므로 텍스트 파싱은 하지 않는다.
  admin 이미지에 `@platform/kit`·`zod`·`@playwright/test`가 설치돼 있어야 한다
- **스캔 시점** (2026-09-16 결정): admin은 **기동할 때 한 번** 자동으로 스캔한다. 배포는 컨테이너 재기동이므로
  배포 직후 목록이 최신이 된다. 그 밖에는 화면의 `다시 스캔하기` 버튼(→ `POST /api/catalog/scan`)으로 돌린다.
  기동 시 스캔이 실패(tcId 중복 등)해도 admin은 뜬다. 실패 사유는 마지막 스캔 결과(`GET /api/catalog/scan`)에 남기고
  목록 화면 위에 보여준다

### 3.2 Execution — 언제 무슨 값으로 돌렸는가

- **책임**: 실행 요청을 받아 러너에 분배하고 결과를 영속화
- **애그리거트 루트**: `TestRun` (식별자 `runId`) → `RunItem[]` → `Step[]`
- **불변식**
  - `RunItem`은 실행 시점의 `params`/`expected`를 **스냅샷으로 복사해 저장**한다.
    `param_set`을 참조만 하면 나중에 값이 바뀌었을 때 과거 증적이 거짓이 된다.
    문서를 만드는 데 필요한 나머지 값도 같은 이유로 실행 기록에 박제한다 (→ §3.3 증적 재현)
  - 동시 실행 수는 설정값(기본 2)을 넘지 않는다
  - `RunItem`은 생성 시 `status = NA`, `finished_at = NULL`이다. 실행이 끝나야 판정이 들어간다.
    러너 고장·타임아웃도 `NA`이며 `error`가 채워진 것으로 구분한다
  - `TestRun.status`는 모든 `RunItem`이 종료되어야 `FINISHED`가 된다
  - 실행 요청은 **반복 횟수**를 받는다. 요청 **최상위에 하나**이고 항목마다 따로 두지 않는다 —
    항목별로 다르면 "실행 항목이 몇 건 생깁니다"를 미리 셀 수 없다(§8.2). 같은 케이스·같은 디바이스를
    그 횟수만큼 돌려 `RunItem`을 그만큼 만들고 **회차**(1부터)를 기록한다. 목적은 **테스트 코드 검증**이다 —
    새로 쓴 테스트가 매번 같은 결과를 내는지 여러 번 돌려 본다. 그래서 같은 실행 안의 유일성 조건이
    `(run_id, tc_id, platform)`에서 `(run_id, tc_id, platform, 회차)`로 넓어진다 (2026-09-16 결정).
    컬럼과 인덱스는 §6, 요청 형태는 §7이 정본이다
  - 반복 횟수에 **상한을 두지 않는다.** 동시 실행 2 제한이 이미 있어 한꺼번에 밀려도 서버가 죽지 않는다.
    오래 걸리는 것은 사람이 보고 판단할 일이지 시스템이 막을 일이 아니다
  - **Playwright의 자동 재시도(`retries`, 실패한 테스트를 몰래 한 번 더 돌려 주는 기능)는 쓰지 않는다.
    `0`으로 고정한다.** 실패를 가리는 것과, 드러내려고 여러 번 돌리는 것은 다른 일이다.
    켜려면 이 문서를 먼저 고친다. 설정 파일 변경은 §5.2에 있다
  - 실행은 **도중에 멈출 수 있다** (2026-09-16 결정). 멈추면 아직 시작하지 않은 항목은 대기줄에서 빼고,
    이미 돌고 있는 항목은 러너에게 끊으라고 지시한다(§3.4). 어느 쪽이든 그 항목은 `status = NA`,
    `error.message = 'ABORTED'`로 닫는다. 판정할 근거가 없는 점이 타임아웃과 같으므로 저장 경로도 같은 것을 탄다
  - 멈춘 실행 묶음의 `TestRun.status`는 `FINISHED`가 아니라 **`ABORTED`**다. 스키마에 이미 있던 값인데 쓰는
    코드가 없었다. "끝까지 돌아서 끝난 것"과 "사람이 끊어서 끝난 것"은 증적에서 구분돼야 한다
  - **항목을 닫는 UPDATE에는 언제나 `AND finished_at IS NULL`을 붙인다.** 중단 처리와 러너 응답이 겹칠 수 있다.
    이 조건이 없으면 나중에 도착한 쪽이 먼저 기록된 판정을 덮어써, 사람이 끊은 실행에 통과 판정이 남거나
    그 반대가 된다. 먼저 온 것만 기록한다
  - **admin이 다시 뜰 때도 같은 처리를 한다.** 부팅 직후 `status = 'RUNNING'`인 `test_run`을 찾아
    미완 항목(`finished_at IS NULL`)을 위와 같은 방법으로 닫고 묶음을 `ABORTED`로 바꾼다. 재기동으로 분배기가
    사라지면 그 항목들은 영원히 끝나지 않아 `FINISHED` 조건이 결코 만족되지 않는다.
    컨테이너 재시작 정책은 §9에 있다

### 3.3 Reporting — 결과를 어떻게 보여주는가

- **책임**: 저장된 결과를 읽어 증적 문서와 지표를 만든다
- **읽기 전용**. 이 컨텍스트는 어떤 테이블에도 write 하지 않는다 (`evidence_document` 제외)
- **불변식 — 증적 재현**: **같은 실행의 증적은 언제 뽑아도 같은 문서가 나온다** (2026-09-16 결정).
  실행 직후에 뽑든 반년 뒤에 뽑든 글자 하나 달라지지 않는다. 증적은 "그때 무슨 값으로 돌려 어떻게 나왔는가"의
  기록이고, 지금의 코드 상태가 섞여 들어가면 기록이 아니라 추정이 된다.
  - **지금은 이 원칙이 지켜지지 않는다.** 증적의 `입력` 칸은 라벨-값 쌍인데(§8.4), 값(`params`·`expected`)만
    `run_item`에 스냅샷으로 남고 **라벨은 `test_case.param_schema`의 `description`에서 온다.**
    그 테이블은 스캔 때마다 덮어쓰는 캐시다(§3.1). 케이스 코드의 `.describe('아이디')`를 `.describe('사용자 ID')`로
    고치고 다시 스캔하면, 작년 실행의 증적을 오늘 뽑았을 때 라벨이 바뀌어 나온다.
    제한 시간·케이스 파일 경로·불러온 입력값 묶음도 같은 문제를 갖는다
  - **그래서 문서를 만드는 데 필요한 것을 전부 실행 기록에 박제한다.** 박제할 자리는 **사실의 크기**로 가른다.
    - 한 번의 실행 전체에 걸린 사실은 **`test_run`**에 넣는다 — 인스턴스 이름, 테스트 저장소 주소,
      대상 서버, 대상 주소, 실행자 이름(§3.5). 항목마다 반복될 값이 아니다
    - 항목 하나에만 걸린 사실은 **`run_item`**에 넣는다 — `param_schema`·`expected_schema`(라벨과 입력 칸 정의),
      회차, 제한 시간, 불러온 입력값 묶음, 케이스 파일 경로
    - 컬럼 정의는 **§6이 정본**이다
  - **리포팅은 문서를 만들 때 `test_case`를 읽지 않는다.** 읽는 순간 이 불변식이 깨진다
  - **박제 이전에 쌓인 행에는 이 원칙이 성립하지 않는다.** 컬럼을 더하기 전 실행은 라벨도 저장소 주소도 비어 있다.
    빈 값은 지어내지 말고 화면과 문서에 `기록 없음`으로 적는다
  - **라벨을 고치지 못하게 막지는 않는다.** "설명 문구는 절대 수정 금지" 같은 규율에 기대는 구조를 만들지 않기
    위해서다. 구조가 막아 주므로 고쳐도 과거 증적은 안전하다. 다만 라벨은 화면·문서·검수자의 기억이 모두 걸린
    문구이므로 **함부로 고치지 않는다**는 원칙은 남긴다
  - 증적 문서 머리말에는 **인스턴스 이름과 테스트 저장소 주소**를 적는다. "무엇을 시험한 것인가"가 문서에
    남아야 한다 (§8.4)
- 산출물 2종
  - **증적 문서**: 사람이 제출. HTML 생성 → PDF 변환.
    PDF 변환은 admin이 Playwright의 `page.pdf()`로 직접 한다 (2026-09-16 결정).
    그래서 admin 이미지도 Playwright 공식 이미지에서 시작한다 (§9)
  - **지표**: Grafana가 Postgres를 직접 조회. 별도 시계열 DB 없음

### 3.4 Runner — 실제로 돌린다

- **책임**: 케이스 1건을 주어진 값으로 실행하고 구조화된 결과를 반환
- **DB 무상태**. 어떤 테이블에도 접근하지 않는다. 돌고 있는 자식 프로세스의 손잡이만 메모리에 들고 있고,
  러너가 죽으면 그 프로세스와 함께 사라진다. 이 규칙이 깨지면 컨테이너 분리가 무의미해진다
- **중단 통로** (2026-09-16 결정): 돌고 있는 실행을 바깥에서 끊을 수 있어야 한다(§3.2). 러너에 `historyId`로
  지목해 끊는 창구를 하나 낸다. **끊는 동작 자체는 이미 있다** — 타임아웃 때 자식 프로세스 그룹을 통째로 죽이는
  코드가 그것이고, 바깥에서 부를 길만 없었다. 엔드포인트와 응답 형태는 **§5.2가 정본**이다
- **이 통로가 생겨도 위 무상태 규칙은 깨지지 않는다.** 러너가 들고 있는 것은 살아 있는 프로세스의 손잡이뿐이고
  DB에 저장된 상태가 아니다. 판정·이력·스냅샷은 여전히 admin만 쓴다. §5.3의 이음새를 떠받치는 규칙도 그대로다
- 끊긴 실행은 **타임아웃과 같은 모양으로** 돌아온다. `error.message`만 `TIMEOUT`이 아니라 `ABORTED`다.
  admin 쪽에 저장 경로를 새로 만들지 않기 위해서다 (§5.2)
- 입출력은 §5.2 계약만 사용

### 3.5 인증 — 누가 눌렀는가 (2026-09-16 결정)

- **책임**: 요청을 보낸 사람이 누구인지 확인하고, 그 이름을 실행 기록에 남긴다
- **애그리거트 루트**: `User` (식별자 `username`)
- **최소 형태**: 아이디·비밀번호 로그인 하나. 로그인하면 세션(브라우저가 들고 다니는 출입증)이 생기고
  `/api/**`는 그 출입증이 있어야 답한다. 팀 공용 비밀번호 한 개는 **채택하지 않는다** — 누가 눌렀는지를
  가릴 수 없어 증적의 실행자 칸이 다시 거짓이 된다
- **불변식**
  - **"누구인지 알아내는 부분"과 "그 이름으로 무슨 일을 하는 부분"을 분리한다.** 앞쪽은 요청 하나를 받아
    `{ username, displayName }`을 돌려주는 함수 하나뿐이다. 실행·카탈로그·리포팅은 그 결과만 받아 쓰고
    비밀번호도 세션도 모른다. 나중에 회사 계정 연동(SSO, 사내 계정 하나로 여러 시스템에 로그인하는 방식)으로
    갈아 끼울 때 **바뀌는 곳이 이 함수 하나여야 한다**
  - 비밀번호는 **해시**(원문을 되돌릴 수 없게 바꾼 값)로만 저장한다. 원문은 DB에도 로그에도 남기지 않는다
  - 실행자는 **로그인한 사람에게서 온다.** 요청 본문에 실린 값은 쓰지 않는다.
    보내는 쪽이 정할 수 있으면 아무 이름이나 적을 수 있어 증적이 증적이 아니게 된다
  - 실행자 이름은 **실행 시점 값으로 `test_run`에 박제한다** (§3.3). 계정 이름이 바뀌거나 계정이 지워져도
    과거 증적은 흔들리지 않아야 한다
- **인증 이전에 쌓인 기록**: 인증을 붙이기 전 실행에는 확인된 실행자가 없다. 실행자 이름 칸이 비어 있는(NULL) 행이
  그 표시다. 화면과 증적 문서는 이 실행의 실행자 칸을 `실행자 미상 (인증 도입 이전)`으로 적는다.
  **값을 지어내 채우지 않는다** — 모르는 것은 모른다고 적는 것이 기록이다
- **지금 하지 않는 것**: 권한 구분(읽기 전용·실행 가능), 팀·소유자 축, 실행 승인 절차. 자리만 남긴다 —
  위 확인 함수가 `displayName` 외에 역할을 하나 더 돌려주게 되는 것이 전부이고 부르는 쪽은 그대로다.
  서비스마다 인스턴스를 따로 띄우므로(§9.2) 한 인스턴스 안에서 권한을 가를 이유가 아직 없다
- **러너 포트를 바깥으로 열지 않는다.** 지금은 호스트에 `4000`이 열려 있어 로그인 화면을 거치지 않고 실행을
  시킬 수 있는 뒷길이다. admin과 러너는 컨테이너끼리만 통하면 된다 (→ §9)
- 계정 테이블(`app_user`)과 실행자 컬럼의 정의는 **§6이 정본**이다. 여기서는 규칙만 적는다
- **새 npm 부품 2종이 필요하다.** CLAUDE.md §3에 따라 설치 전에 승인을 받는다

  | 쓸 곳 | 무엇 |
  |------|------|
  | 로그인 상태 유지 | Fastify의 쿠키·세션 플러그인 |
  | 비밀번호 해시 | 되돌릴 수 없는 해시 라이브러리 |

---

## 4. 명세 선언 방식 (가장 중요)

테스트 코드 안에 명세를 함께 선언한다. 이 선언 하나가 **입력 폼 · 검증 · 증적 문서**를 전부 만든다.

```ts
// tests/auth/login.spec.ts
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'AUTH-002',
  name: '유효한 이메일과 비밀번호로 로그인하면 토큰이 발급된다',
  platforms: ['desktop', 'mobile'],     // 생략 시 ['desktop']
  precondition: [
    '가입 완료된 사용자 계정이 존재한다',
    '계정이 잠금 상태가 아니다',
  ],
  params: z.object({
    username: z.string().min(1).describe('아이디'),
    password: z.string().min(1).describe('비밀번호').meta({ secret: true }),
  }),
  expected: z.object({
    statusCode: z.number().describe('응답 코드'),
    hasToken:   z.boolean().describe('토큰 발급 여부'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const res = await test.step('로그인 API를 호출한다', async () => {
    const res = await request.post('/api/login', { data: params });
    await verify('응답 코드가 정상이다', res.status(), expected.statusCode, { blocker: true });
    return res;
  });

  await test.step('토큰을 검증한다', async () => {
    const body = await res.json();
    await verify('토큰이 발급된다', !!body.token, expected.hasToken);
  });

  await test.step('로그인 후 화면을 확인한다', async () => {
    await page.goto('/dashboard');
  }, { capture: true });
});
```

### 각 필드가 어디에 쓰이는가

| 필드 | 쓰이는 곳 |
|------|----------|
| `tcId` | 검색, 파라미터 주입 키, 증적 문서 항목 번호, 이력 추적 |
| `platforms` | 실행 화면의 디바이스 선택지, 실행 시 생성될 `RunItem` 개수 |
| `name` | 목록 화면, 증적 문서 "검증 항목" 칸 |
| `precondition` | 증적 문서 "사전조건" 칸 |
| `params` | **입력 폼 자동 생성** (`describe`가 한글 라벨, `enum`이면 드롭다운, `optional`이면 선택 입력), 실행 전 검증 |
| `expected` | 기대값 입력 폼, 증적 문서 "기대결과" 칸 |
| `test.step` | 증적 문서 "시험 절차" 칸, 실패 지점 표시 |
| `verify` | 증적 문서 "판정" 칸, 검증 문장 단위 PASS/FAIL |

`spec`은 반드시 `export const spec`으로 내보낸다. 스캐너가 이 이름을 찾는다 (§3.1).

`verify(문장, 실제값, 기대값, { blocker?: true })` — 앞의 세 인자를 그대로 결과에 남긴다.
`expect`를 직접 쓰면 문장이 남지 않으므로 **테스트 코드에서 `expect` 직접 사용을 금지**한다.

### verify 실패 규칙 (2026-09-16 결정)

- `verify`는 **절차(`test.step`) 안에서만** 부른다. 밖에서 부르면 kit이 에러를 던진다.
  화면과 증적 문서가 절차 아래에 검증 문장을 보여주는 구조이기 때문이다
- 실패해도 **기본은 계속 간다.** 그 문장은 FAIL로 기록되고 다음 문장·다음 절차를 계속 돌린다.
  화면 문구가 바뀐 정도의 실패로 뒤 절차까지 버리지 않기 위해서다
- 뒤를 돌릴 의미가 없는 검증에는 `{ blocker: true }`를 붙인다. 이 문장이 실패하면 **그 절차를 끝으로 멈춘다.**
  로그인 실패처럼 뒤 절차의 전제가 무너지는 경우다. 시스템은 값만 보고 사유를 알 수 없으므로 작성자가 표시한다
- 예외(요소를 못 찾음, 페이지가 안 뜸 등)는 코드가 더 갈 수 없으므로 **항상 멈춘다.** 그 절차는 FAIL + `error`
- 판정: 검증 문장이 하나라도 FAIL이면 절차도 항목도 FAIL. 멈춘 뒤 돌지 않은 절차는 문서에 나오지 않는다
  (절차는 실행해 봐야 알 수 있다). 대신 멈추게 한 문장에 `실행 중단`을 표시해 뒤가 왜 없는지 알린다

### 테스트 코드에는 주석을 쓰지 않는다

주석이 들어갈 자리를 이미 선언이 가져갔다.

| 적고 싶은 것 | 적을 자리 |
|-------------|----------|
| 이 테스트가 무엇을 검증하는가 | `name` |
| 어떤 상태를 전제하는가 | `precondition` |
| 이 단계에서 무엇을 하는가 | `test.step`의 제목 |
| 여기서 무엇을 확인하는가 | `verify`의 문장 |

주석은 화면에도 증적 문서에도 나오지 않는다. 같은 설명이 두 군데 생기면
코드를 고칠 때 한쪽만 고쳐져 주석이 거짓말을 시작한다.

**적용 범위**: `tests/**` 만. 러너·스캐너 등 플랫폼 코드는 CLAUDE.md의
기존 규칙(왜만 적는다)을 따른다.

### 케이스 파일 규칙 — `npm run check:tests`가 기계로 검사한다 (2026-09-16 결정)

테스트 코드는 사람이 쓸 수도 있다. 그래서 아래 규칙은 Claude 훅이 아니라 **저장소에 올릴 때 CI가** 검사한다.
검사기는 WS-A의 스캐너를 저장 없이 돌리는 모드이며, 어긋나면 `파일:줄 — 무엇이 — 왜 문제` 한 줄로 알린다.

| # | 규칙 | 어기면 무엇이 안 되나 |
|---|------|---------------------|
| K1 | 파일 1개 = 케이스 1건. `export const spec = defineCase(...)`가 정확히 하나 | 스캐너가 명세를 못 찾는다 |
| K2 | `tcId`가 `<대문자 2~6자>-<3자리>` 형식이고 전체에서 유일 | 검색·이력·문서 번호가 깨진다 |
| K3 | `name`이 비어 있지 않은 문장 | 목록과 문서의 "검증 항목" 칸이 빈다 |
| K4 | `precondition`·`params`·`expected`는 생략 불가. 없으면 `precondition: []`, `params: null`, `expected: null`로 **없다고 적는다.** 스키마가 있으면 모든 필드에 `.describe()` | 깜빡한 것과 정말 없는 것을 구분할 수 없다. `.describe()`가 없으면 입력 폼 라벨을 못 만든다 |
| K5 | `platforms`가 `desktop`·`mobile`만 | 러너의 `--project`가 실패한다 |
| K6 | `test.step`의 제목과 `verify`의 문장이 비어 있지 않은 문자열 리터럴이고, `verify`가 1개 이상 | 절차·판정 칸이 비어 증적이 못 된다 |
| K7 | 주석 없음, `expect` 직접 호출 없음 | 위 "테스트 코드에는 주석을 쓰지 않는다" |
| K8 | `npx playwright test --list`가 파일마다 테스트 1개를 등록 | 문법 오류, import 실패 |
| K9 | `params` 스키마의 비밀값 칸에 `.meta({ secret: true })`가 붙어 있다. 칸 이름에 `password`·`passwd`·`pw`·`token`·`secret`·`apiKey`·`credential`이 들어 있는데 꼬리표가 없으면 위반 (§4.1) | 비밀번호가 화면과 증적 문서에 평문으로 박힌다 |
| K10 | **값을 반드시 받아야 하는 칸이 없다.** `params`·`expected`의 모든 칸이 `.default()`를 갖거나 `.optional()`이다. 변환된 스키마의 `required`가 비어 있지 않으면 위반 (2026-09-16 결정) | 정기 실행이 그 케이스를 돌리지 못한다. 사람이 값을 채워야만 도는 케이스는 매일 자동으로 돌 수 없다 (§9.2) |

문장이 검수자가 읽을 만한가(품질)는 기계가 못 본다. 그건 갈래를 끝낼 때 spec-review가 본다.

**없으면 없다고 적는다.** (2026-09-16 결정) `null`은 선언에서만 쓴다. 스캐너는 빈 객체 스키마로 기록하고
(`param_schema`·`expected_schema`는 `NOT NULL` 그대로), 실행 때 kit은 빈 객체를 넘긴다.
화면은 입력칸을 만들지 않고, 문서는 "입력 없음"으로 쓴다. `platforms`만 생략할 수 있다 — 기본값 `['desktop']`이 의도된 것이다.

입력값·기대값이 없는 케이스는 이렇게 생긴다.

```ts
export const spec = defineCase({
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  precondition: [],
  params: null,
  expected: null,
});
```

### 스크린샷

- **실패한 스텝은 자동으로 찍는다.** 통과한 화면은 아무도 열어보지 않고,
  전부 찍으면 실행 한 번에 수십 장이 쌓여 디스크가 금방 찬다
- **증적용으로 명시 지정**: `test.step(제목, fn, { capture: true })`.
  인자 순서는 Playwright의 `test.step(title, body, options)`와 같다. kit의 `test`는 Playwright를
  감싼 래퍼이고 `capture`는 kit이 추가한 옵션이다.
  검수 문서에 "이 화면이 이렇게 나왔다"를 넣어야 할 때 쓴다. 기본값은 false
- API 테스트는 화면이 없으므로 대신 요청·응답 원문을 같은 자리에 남긴다

### 4.1 비밀값 꼬리표 (2026-09-16 결정)

로그인 케이스의 `password`처럼 **문서에 남으면 안 되는 입력값**이 있다. 이것을 **비밀값**이라 부른다.
선언에서 그 칸에 꼬리표를 달아 둔다.

```ts
params: z.object({
  username: z.string().min(1).describe('아이디'),
  password: z.string().min(1).describe('비밀번호').meta({ secret: true }),
}),
```

`.meta({ ... })`는 zod가 스키마에 꼬리표(메타데이터, 값 자체가 아니라 값에 붙이는 설명표)를 다는 기능이다.
JSON Schema로 바꿀 때 그 칸 아래에 `"secret": true`로 그대로 살아남고 `.describe()`도 함께 남는다.
이 저장소에 깔린 zod로 확인했다. **kit에 새 함수를 만들지 않는다.** 이미 있는 기능이라 추가할 코드가 0줄이다.

**가리는 것은 화면과 문서뿐이다. DB에는 평문 그대로 넣는다.**

| 어디 | 무엇을 한다 |
|------|------------|
| 실행 설정 화면 (§8.2) | 타이핑할 때 글자가 보이지 않는 입력칸으로 만든다 |
| 실행 결과 목록·항목 상세 (§8.3·§8.4) | 값을 `********`로 바꿔 보여준다 |
| 증적 문서 (§8.4) | 같다. `********`만 들어간다 |
| `run_item.params` (§6) | **평문 그대로 저장한다** |

저장 시점에 가리면 그 실행을 다시 돌릴 수 없고, 값이 틀려서 실패한 것인지 알 방법도 같이 사라진다.
여기 들어오는 것은 테스트 전용 계정뿐이므로 저장을 막아서 얻는 것보다 잃는 것이 크다.

**기계가 못 잡는 자리가 있다.** K9는 칸 **이름**만 보고 판단한다.
`answer`·`code`처럼 이름만으로는 비밀값인지 알 수 없는 칸은 검사기가 그냥 지나친다.
그건 케이스를 쓰는 사람이 직접 달아야 하고, 갈래를 끝낼 때 spec-review가 사람 눈으로 본다.
이 한계를 메우려고 값의 생김새를 추측하는 규칙은 넣지 않는다. 오탐이 늘면 아무도 검사기를 안 믿는다.

---

## 5. 계약 (변경 시 반드시 이 문서부터 수정)

### 5.1 Shared Kernel 타입

`packages/kit/src/types.ts`. 모든 컨텍스트가 이 타입만 주고받는다.

```ts
export type TcId = string;                         // 'AUTH-002'
export type Platform = 'desktop' | 'mobile';
export type ItemStatus = 'PASS' | 'FAIL' | 'NA';   // 3종을 늘리지 않는다. 늘리면 화면·문서·조회가 동시에 멈춘다.
                                                   // '아직 안 끝남'은 finished_at이 NULL인 것으로 구분한다 (§3.2)
export type JsonSchema = Record<string, unknown>;  // zod 내장 z.toJSONSchema(schema, { io: 'input' }) 출력. 검증하지 않고 그대로 저장·전달한다

export interface CaseSpec {
  tcId: TcId;
  name: string;
  platforms: Platform[];        // 비면 ['desktop']
  precondition: string[];
  paramSchema: JsonSchema;      // zod 내장 변환 결과. 코드에서 null이면 빈 객체 스키마. 비밀값 칸에는 secret: true가 실려 온다 (§4.1)
  expectedSchema: JsonSchema;
  filePath: string;             // 소스 루트 기준 상대 경로
}

export interface AssertionResult {
  statement: string;            // '응답 코드가 정상이다'
  status: ItemStatus;
  actual: unknown;
  expected: unknown;
  blocker?: boolean;            // true면 이 실패로 실행을 중단했다 (§4 verify 실패 규칙)
}

export interface StepResult {
  seq: number;
  title: string;                // '로그인 API를 호출한다'
  status: ItemStatus;
  durationMs: number;
  assertions: AssertionResult[];
  line?: number;                // 실패한 소스 줄 번호. 코드 뷰가 이 줄을 중심으로 연다
  screenshotPath?: string;      // 실패 시 자동, 또는 capture:true인 스텝
  httpTrace?: { request: unknown; response: unknown };  // API 테스트용
  error?: { message: string; stack?: string };
}

export interface ExecuteRequest {
  runId: number;                // 스크린샷 경로 artifacts/runs/{runId}/{historyId}/ 를 만들 때만 쓴다
  historyId: number;
  tcId: TcId;
  platform: Platform;           // Playwright project 이름과 일치시킨다
  filePath: string;
  baseUrl: string;              // 이번 실행이 두드릴 주소. admin이 대상 서버 이름을 주소로 바꿔 싣는다 (§5.2)
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs: number;            // 기본 300000
}

export interface ExecuteResponse {
  historyId: number;
  status: ItemStatus;
  durationMs: number;
  steps: StepResult[];
  error?: { message: string; stack?: string };
}
```

### 5.2 Runner HTTP 계약

```
POST http://runner:4000/execute
Content-Type: application/json
Body:     ExecuteRequest
200 OK:   ExecuteResponse
400:      { error: 'INVALID_REQUEST', detail: string }
404:      { error: 'CASE_NOT_FOUND', detail: string }
500:      { error: 'RUNNER_ERROR', detail: string }

POST http://runner:4000/abort
Content-Type: application/json
Body:     { historyId: number }
200 OK:   { aborted: boolean }
          돌고 있던 자식 프로세스를 그룹째 끊었으면 true.
          이미 끝났거나 러너가 모르는 historyId면 false다 — 경합이지 고장이 아니므로 404로 만들지 않는다.
          끊긴 실행의 /execute 응답은 타임아웃과 같은 모양으로 돌아온다 (error.message = 'ABORTED')
400:      { error: 'INVALID_REQUEST', detail: string }

GET  http://runner:4000/health   → 200 { ok: true, playwrightVersion: string }
```

- **동기 호출.** Execution이 동시성 2로 제한해 호출한다
- 러너는 `ExecuteRequest.params`를 환경변수 `PLATFORM_PARAMS`(JSON 문자열)로 주입하고
  `npx playwright test <filePath> --project=<platform>`을 자식 프로세스로 실행한다
- 결과는 커스텀 리포터가 stdout에 **JSON 한 줄**(`@@RESULT@@{...}`)로 뱉고 러너가 파싱한다
- **타임아웃**: `timeoutMs`가 지나면 러너가 자식 프로세스를 죽이고 `200`으로
  `{ status: 'NA', error: { message: 'TIMEOUT' }, steps: <파싱된 것이 있으면 그것, 없으면 []> }`을 돌려준다.
  `500`은 러너 자체의 고장(프로세스 기동 실패 등)에만 쓴다
- Execution이 러너를 부를 때의 HTTP 타임아웃은 `timeoutMs + 30초`다. 러너가 먼저 끊어야 부분 결과가 남는다
- 케이스 1건 = Playwright 프로세스 1개(`workers: 1`). 동시 실행은 Execution의 동시성(2)으로만 제어한다
- **`baseUrl`**: 그 실행이 두드릴 주소다. 사람은 화면에서 **대상 서버**(개발·QA·스테이징) 이름만 고르고,
  admin이 자기 설정표에서 주소를 찾아 이 칸에 실어 보낸다. 러너는 어떤 대상 서버가 있는지 모른다 — 주소 하나만 받는다.
  러너는 이 값을 환경변수 `PLATFORM_BASE_URL`로 자식 프로세스에 넘기고 `playwright.config.ts`가 `use.baseURL`로 받는다.
  주소를 아는 쪽을 admin 하나로 묶어야 러너가 도메인 상태를 갖지 않는다
- **자동 재시도는 쓰지 않는다. `playwright.config.ts`의 `retries`는 0으로 명시해 고정한다.**
  실패를 가려서 초록불을 만드는 것과, 불안정한지 보려고 일부러 여러 번 돌리는 것은 다른 일이다.
  여러 번 돌리는 쪽은 실행 요청의 `repeat`가 맡는다. 켜려면 이 문장을 먼저 고친다.
  같은 문장을 `playwright.config.ts`의 `retries` 자리에 주석으로도 남긴다 — 설정 파일만 보고 켜 버리는 일을 막는다
- **반복 실행은 러너에 보이지 않는다.** admin이 `historyId`만 다른 같은 요청을 N번 보낼 뿐이다.
  회차(`attempt`)를 러너 계약에 넣지 않는다. 러너는 회차로 아무 일도 하지 않고,
  스크린샷 경로가 이미 `historyId`로 갈라져 있어 서로 덮어쓰지 않는다
- **중단**: `POST /abort`는 `historyId`로 돌고 있는 자식 프로세스를 지목해 **프로세스 그룹째** 끊는다.
  끊는 방식은 타임아웃과 완전히 같다. 바깥에서 부를 통로만 새로 낸 것이다.
  실행 묶음 전체를 끊는 일은 admin이 자기가 아는 `historyId`를 하나씩 부르는 것으로 한다.
  러너에 `runId` 단위 중단을 두면 러너가 실행 묶음을 알아야 한다
- 끊긴 실행의 `POST /execute` 응답은 **타임아웃과 같은 모양**으로 돌아온다.
  `200` + `{ status: 'NA', error: { message: 'ABORTED' }, steps: <파싱된 것이 있으면 그것, 없으면 []> }`.
  모양이 같아야 Execution의 저장 경로에 새 분기가 생기지 않는다
- 이미 끝났거나 러너가 모르는 `historyId`에는 `200 { aborted: false }`를 돌려준다.
  중단 요청과 정상 종료가 겹치는 것은 **경합이지 고장이 아니다.** 404로 만들면 Execution이 정상 상황마다 에러를 받는다
- 러너는 `historyId → 자식 프로세스` 지도를 **메모리에만** 들고 있는다. DB는 여전히 모른다 (§3.4).
  러너가 죽으면 지도도 자식 프로세스도 같이 사라지므로, 남은 항목을 닫는 일은 admin의 재기동 복구가 맡는다

```
[계약 변경 필요]
대상:    playwright.config.ts
현재:    use 블록이 없고 retries 항목도 없다 (Playwright 기본값 0이라 동작은 같다)
제안:    use.baseURL을 process.env.PLATFORM_BASE_URL에서 받게 하고, retries: 0을 명시적으로 새로 적으면서
         "켜려면 SPEC §5.2를 먼저 고친다"를 주석으로 붙인다
이유:    대상 서버를 골라 실행하려면 그날 친 주소가 설정까지 내려와야 한다. retries는 지금 안 적혀 있어
         누가 켜도 아무 표시가 남지 않는다
영향:    WS-C(러너가 PLATFORM_BASE_URL을 넘긴다), WS-B(주소를 찾아 싣는다), 잠긴 공용 골격이므로 §1.2 승인 필요
```

### 5.3 나중을 위한 이음새

이음새는 '나중에 갈아 끼울 수 있다'는 뜻이지 '지금 아무 준비도 필요 없다'는 뜻이 아니다.
전제를 안 적어 두면 갈아 끼우는 날 조용히 틀린 결과가 나온다. (2026-09-16 결정)

| 확장 | 바꿀 곳 | 전제와 영향 |
|------|--------|-----------|
| 러너 여러 대 | Execution의 디스패처가 러너 URL 목록을 라운드로빈. 중단(`POST /abort`)은 그 항목을 맡은 러너에게만 보낸다 | **artifacts 볼륨을 모든 러너가 같이 본다는 것이 전제다.** 스크린샷 경로가 `artifacts/runs/{runId}/{historyId}/{seq}.png` 하나뿐이라, 러너마다 다른 디스크에 쓰면 admin이 절반을 못 찾는다. 파일시스템을 못 나누면 러너를 늘리기 전에 S3 쪽을 먼저 해야 한다 |
| 메시지 큐 도입 | `POST /execute` 호출부를 큐 발행으로 교체 + 콜백 수신 엔드포인트 추가 | 큐는 같은 메시지를 **두 번 줄 수 있다.** 중복인지는 `historyId`로 가려내고, 결과 되쓰기 UPDATE에는 `AND finished_at IS NULL`을 붙여 **먼저 온 것만** 기록한다. 이 가드는 중단과 결과 도착이 겹칠 때도 같은 일을 하므로 큐 없이도 지금 넣어 둔다. Runner 내부 로직은 안 바뀐다 |
| S3 배포 | 테스트 소스를 내려받아 `PLATFORM_TESTS_DIR` 폴더를 **채우는 단계**만 앞에 붙인다 | 경로 자체를 `s3://`로 바꾸지 않는다. 스캐너는 파일을 동적 import 하고 러너는 그 경로로 `npx playwright test`를 돌리므로, 로컬 경로가 아니면 둘 다 깨진다. 바꾸는 것은 '어디서 받아오는가'이고 '무엇을 읽는가'는 그대로다 |
| 검색엔진 도입 | Catalog의 검색 함수 **하나**를 엔진 질의로 교체 | 전제가 넷이다. ① 검색 호출이 함수 하나에 모여 있어야 한다. 화면이나 라우트에서 SQL을 직접 짜면 갈아 끼울 자리가 여러 곳이 된다 ② 색인 대상은 **케이스 속성**뿐이다. `마지막 결과`는 색인하지 않는다 — 실행할 때마다 바뀌어 색인이 조용히 어긋난다 ③ 정렬이 **관련도순**으로 바뀐다. 응답의 `sort`에 정렬 기준을 실어 보내고 화면은 순서를 전제하지 않는다 ④ `총 N건`이 **근사치일 수 있다.** `totalIsExact`가 false면 화면은 이 값으로 페이지 수를 계산하지 않는다 |

검색엔진을 지금 붙이지 않는 이유는 §1 「범위 밖」에, 검색 조건 다섯과 화면 규칙은 §8.1에 있다.

**이 이음새를 지키는 유일한 규칙: 러너는 DB를 모른다.**

---

## 6. 데이터 모델

```sql
-- 카탈로그 (스캔 결과 캐시. 진실의 원천은 코드)
CREATE TABLE test_case (
  tc_id           TEXT PRIMARY KEY,
  name            TEXT        NOT NULL,
  platforms       JSONB       NOT NULL DEFAULT '["desktop"]',
  precondition    JSONB       NOT NULL DEFAULT '[]',
  file_path       TEXT        NOT NULL,
  param_schema    JSONB       NOT NULL,
  expected_schema JSONB       NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 저장된 입력값 묶음 (파라미터별 행 분리 금지. JSONB 통째로)
CREATE TABLE param_set (
  id          BIGSERIAL PRIMARY KEY,
  tc_id       TEXT        NOT NULL REFERENCES test_case(tc_id),
  name        TEXT        NOT NULL,
  params      JSONB       NOT NULL,
  expected    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tc_id, name)
);

-- 실행 묶음 (한 번의 실행 전체에 걸린 사실은 전부 여기에 박제한다)
CREATE TABLE test_run (
  run_id            BIGSERIAL PRIMARY KEY,
  title             TEXT        NOT NULL,
  instance_name     TEXT        NOT NULL,   -- 스냅샷. 어느 인스턴스가 돌렸는지. 증적 머리말에 찍힌다 (§9.2)
  tests_repo        TEXT        NOT NULL,   -- 스냅샷. 무엇을 시험했는지. 설정으로 받아 기재만 한다 (§9.2)
  triggered_by      TEXT        NOT NULL,   -- 로그인한 사람의 아이디 (§7 Auth). app_user를 가리키지만 FK는 걸지 않는다
  triggered_by_name TEXT,                   -- 스냅샷. 실행 당시의 사람 이름. NULL이면 인증 도입 이전 (§7.1)
  env               TEXT        NOT NULL,   -- 대상 서버 키. 기본값을 두지 않는다 (2026-09-16 결정)
  base_url          TEXT        NOT NULL,   -- 스냅샷. 그날 실제로 친 주소. env→주소 매핑이 바뀌어도 남는다
  status            TEXT        NOT NULL,   -- RUNNING | FINISHED | ABORTED
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ
);

-- 로그인 계정 (§3.5). 권한 칸은 만들지 않는다 — 구분이 실제로 필요해지는 날 더한다
CREATE TABLE app_user (
  username      TEXT PRIMARY KEY,
  display_name  TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON app_user FROM grafana_ro;   -- 비밀번호 해시가 대시보드로 새면 안 된다

-- 실행 항목 (항목마다 달라지는 사실만. 증적 한 줄을 만드는 데 필요한 것은 전부 실행 시점 스냅샷이다)
CREATE TABLE run_item (
  history_id      BIGSERIAL PRIMARY KEY,
  run_id          BIGINT      NOT NULL REFERENCES test_run(run_id),
  tc_id           TEXT        NOT NULL,
  platform        TEXT        NOT NULL DEFAULT 'desktop',  -- desktop | mobile
  attempt         INTEGER     NOT NULL DEFAULT 1,   -- 회차. 같은 케이스×디바이스를 반복 실행한 순번 (1부터)
  tc_name         TEXT        NOT NULL,   -- 스냅샷. 이름이 바뀌어도 증적의 검증 항목 칸은 그대로
  file_path       TEXT        NOT NULL,   -- 스냅샷. 케이스가 다른 파일로 옮겨가도 무엇을 돌렸는지 남는다
  precondition    JSONB       NOT NULL DEFAULT '[]',   -- 스냅샷. 증적의 사전조건 칸
  params          JSONB       NOT NULL,   -- 스냅샷. 증적의 입력 칸 '값'
  expected        JSONB       NOT NULL,   -- 스냅샷. 증적의 기대결과 칸 '값'
  param_schema    JSONB       NOT NULL DEFAULT '{}',   -- 스냅샷. 증적의 입력 칸 '라벨'. 카탈로그는 캐시라 못 믿는다
  expected_schema JSONB       NOT NULL DEFAULT '{}',   -- 스냅샷. 증적의 기대결과 칸 '라벨'
  param_set_id    BIGINT,                 -- 어느 입력값 묶음에서 왔는지. FK를 걸지 않는다 (묶음 삭제가 막히면 안 된다)
  timeout_ms      INTEGER,                -- 스냅샷. 이 항목에 몇 초를 줬는지. 새 행은 반드시 채운다. NULL은 마이그레이션 이전 행뿐이다
  status          TEXT        NOT NULL,   -- PASS | FAIL | NA. 생성 시 NA, finished_at이 NULL이면 아직 실행 전
  duration_ms     INTEGER,
  error           JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);
CREATE INDEX ON run_item (run_id);
CREATE INDEX ON run_item (tc_id, platform, started_at DESC);  -- 케이스×디바이스 이력 추적
-- 같은 run 안에서 같은 케이스가 디바이스별·회차별로 각각 1행씩 쌓인다
CREATE UNIQUE INDEX ON run_item (run_id, tc_id, platform, attempt);

-- 절차 + 검증 문장
CREATE TABLE run_item_step (
  id              BIGSERIAL PRIMARY KEY,
  history_id      BIGINT  NOT NULL REFERENCES run_item(history_id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  title           TEXT    NOT NULL,
  status          TEXT    NOT NULL,
  duration_ms     INTEGER,
  assertions      JSONB   NOT NULL DEFAULT '[]',  -- AssertionResult[]
  line            INTEGER,                        -- 실패한 소스 줄 번호
  screenshot_path TEXT,
  http_trace      JSONB,                          -- API 테스트의 요청·응답 원문
  error           JSONB,
  UNIQUE (history_id, seq)
);

-- 생성된 증적 문서
CREATE TABLE evidence_document (
  id           BIGSERIAL PRIMARY KEY,
  run_id       BIGINT      NOT NULL REFERENCES test_run(run_id),
  format       TEXT        NOT NULL,   -- HTML | PDF
  file_path    TEXT        NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**왜 이렇게까지 박제하는가** (2026-09-16 결정).
원칙은 하나다. **같은 실행의 증적은 언제 뽑아도 같은 문서가 나온다.**
증적을 실행 직후에 뽑지 않으면 그 사이의 코드 변경이 문서에 섞여 들어간다.

**한 번의 실행 전체에 걸린 사실은 `test_run`에, 항목마다 다른 사실은 `run_item`에 둔다.**
인스턴스 이름·테스트 저장소·대상 서버·대상 주소·실행자는 실행 하나에 하나뿐이라
항목마다 반복될 값이 아니다.

| 칸 | 어디에 | 여기 없으면 |
|----|-------|-----------|
| `instance_name` | `test_run` | 인스턴스가 여러 대인데 증적 머리말이 어느 쪽에서 나온 문서인지 말하지 못한다 (§9.2) |
| `tests_repo` | `test_run` | "무엇을 시험한 것인가"가 문서에 남지 않는다. 설정으로 받아 기재만 한다. 플랫폼이 저장소에서 직접 받아오지는 않는다 |
| `env` · `base_url` | `test_run` | `env`→주소 매핑은 admin 설정이 갖고 있고 설정은 바뀐다. 주소까지 박아야 반년 뒤에 "그때 QA가 어디였는지"를 되짚을 수 있다 |
| `triggered_by_name` | `test_run` | 계정 이름을 바꾸거나 계정을 지우면 과거 증적의 실행자 칸이 흔들린다 |
| `param_schema`·`expected_schema` | `run_item` | 입력·기대결과 칸의 **라벨**을 카탈로그에서 읽게 된다. 케이스 코드의 설명 문구(`.describe()`)를 고친 날, 반년 전 실행의 증적 라벨까지 같이 바뀐다 |
| `timeout_ms` | `run_item` | 타임아웃으로 `NA`가 난 항목을 나중에 볼 때 몇 초를 줬는지 알 수 없다. 5초를 준 것과 5분을 준 것은 전혀 다른 이야기다 |
| `param_set_id` | `run_item` | "어느 입력값 묶음으로 돌렸는지"가 사라진다. **외래키를 걸지 않는다** — 묶음을 지웠다고 과거 실행이 지워지거나 삭제가 막히면 안 된다 |
| `file_path` | `run_item` | 케이스 파일이 옮겨가거나 지워지면 그날 무슨 파일을 돌렸는지 되짚을 수 없다 |
| `attempt` | `run_item` | 반복 실행한 회차가 서로 덮어써진다 |

`env`에 기본값을 두지 않는 이유. 안 채우면 빈 칸이 아니라 **틀린 값**이 남는다.
`DEFAULT 'demo'`가 있으면 QA 서버에 쏜 실행도 증적에 `demo`로 찍혀 문서가 거짓말을 한다.
지금 실행 생성 코드가 실제로 `env`를 넣지 않고 INSERT 하고 있어 이미 그 상태다.
`timeout_ms`에 기본값을 두지 않고 NULL을 허용하는 것도 같은 이유다.
`300000`을 채워 두면 빈 칸이 아니라 틀린 숫자가 남는다.

**마이그레이션 이전에 쌓인 행에는 이 원칙이 소급되지 않는다.**
새로 생긴 칸은 옛 행에서 `''`·`'{}'`·`NULL`로 남는다.
화면과 증적 문서는 이것을 **`기록 없음`** 으로 쓰고 **채워 넣지 않는다.**
모르는 것을 아는 척하면 그게 다음 거짓말이다.

**권한 칸(`role`)을 만들지 않는다** (2026-09-16 결정). 권한 구분·팀·승인 절차는 지금 하지 않는다.
쓰지도 않을 칸을 미리 만들면 전부 같은 값이 들어가고, 그 칸을 보는 코드가 생기면서
"구분이 있는 것처럼" 보이기 시작한다. 구분이 실제로 필요해지는 날 칸을 더한다.
같은 이유로 `is_active`도 만들지 않는다.
`test_run.triggered_by`가 `app_user.username`을 가리키지만 **외래키를 걸지 않는다.**
계정을 지웠다고 과거 실행이 지워지거나 삭제가 막히면 안 된다.
이름은 실행할 때 `test_run.triggered_by_name`에 이미 박제돼 있다.

```sql
[계약 변경 필요]
대상:    db/migrations — test_run · run_item · 새 표 app_user
현재:    test_run에 env DEFAULT 'demo'. 실행의 스냅샷은 tc_name·precondition·params·expected뿐.
         로그인 계정을 둘 자리가 없다
제안:    test_run에 instance_name · tests_repo · base_url · triggered_by_name을 더하고 env의 DEFAULT를 없앤다.
         run_item에 attempt · file_path · param_schema · expected_schema · param_set_id · timeout_ms를 더하고
         유일성을 (run_id, tc_id, platform, attempt)로 넓힌다.
         app_user (username PK, display_name, password_hash, created_at)를 신설하고 grafana_ro에는 권한을 주지 않는다
이유:    증적의 라벨·타임아웃·주소·실행자가 지금은 스캔 때마다 덮어쓰는 캐시와 바뀌는 설정에서 읽혀,
         나중에 뽑으면 다른 문서가 나온다. 회차는 유일성 조건에 들어가야 반복 실행이 한 run에 담긴다.
         실행자를 가릴 수 없으면 증적의 실행자 칸이 아무나 적을 수 있는 자유 문자열이다
영향:    WS-B(실행 생성·저장·조회), WS-C(러너 요청에 실을 주소), WS-D(증적 문서·Grafana),
         WS-E(대상 서버 선택 칸·로그인 화면·회차 표시)

-- 새 마이그레이션 파일 예: db/migrations/20260916000002_run_snapshot_and_user.sql
ALTER TABLE test_run ALTER COLUMN env DROP DEFAULT;
ALTER TABLE test_run
  ADD COLUMN instance_name     TEXT NOT NULL DEFAULT '',
  ADD COLUMN tests_repo        TEXT NOT NULL DEFAULT '',
  ADD COLUMN base_url          TEXT NOT NULL DEFAULT '',
  ADD COLUMN triggered_by_name TEXT;
ALTER TABLE test_run ALTER COLUMN instance_name DROP DEFAULT;
ALTER TABLE test_run ALTER COLUMN tests_repo    DROP DEFAULT;
ALTER TABLE test_run ALTER COLUMN base_url      DROP DEFAULT;

ALTER TABLE run_item
  ADD COLUMN attempt         INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN file_path       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN param_schema    JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN expected_schema JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN param_set_id    BIGINT,
  ADD COLUMN timeout_ms      INTEGER;
ALTER TABLE run_item ALTER COLUMN file_path DROP DEFAULT;

-- 기존 유일성 인덱스를 회차까지 포함하도록 갈아 끼운다.
-- 이름은 Postgres가 붙인 자동 이름이다. 적용 전에 \d run_item으로 확인한다
DROP INDEX run_item_run_id_tc_id_platform_idx;
CREATE UNIQUE INDEX ON run_item (run_id, tc_id, platform, attempt);

CREATE TABLE app_user (
  username      TEXT PRIMARY KEY,
  display_name  TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 마이그레이션의 GRANT SELECT ON ALL TABLES는 그때 있던 표에만 붙었으므로
-- app_user는 자동으로 포함되지 않는다. 그래도 명시해 둔다. 비밀번호 해시가 대시보드로 새면 안 된다
REVOKE ALL ON app_user FROM grafana_ro;

-- 이미 쌓인 행의 새 칸은 ''·'{}'·NULL로 남는다. 화면과 증적은 '기록 없음'으로 쓴다.
-- 옛 값을 지금 값으로 덮지 않는다
```

---

## 7. Admin API

```
# Auth
POST   /api/auth/login                   { username, password } → { user: { username, name } }
                                         틀리면 401 { error: 'INVALID_CREDENTIALS' }.
                                         아이디가 틀렸는지 비밀번호가 틀렸는지는 알리지 않는다
POST   /api/auth/logout                  → 204
GET    /api/auth/me                      → { user: { username, name } }. 로그인 안 했으면 401

# Catalog
POST   /api/catalog/scan                 소스 폴더 재스캔 → { added, updated, deactivated, duplicates[] }
GET    /api/catalog/scan                 마지막 스캔 결과 → { scannedAt, added, updated, deactivated, duplicates[], error? }
GET    /api/catalog/cases                케이스 검색. 아래 조건을 AND로 겹친다 (조건 정의는 §8.1)
         ?q=          글자. 이름·tcId 부분 일치
         ?domain=     기능 영역. tcId 접두사 (예: AUTH)
         ?platform=   디바이스. desktop | mobile
         ?active=     활성 여부. true | false. 생략하면 활성만
         ?page=
       → { items, total, totalIsExact, sort, page, pageSize }
GET    /api/catalog/cases/:tcId          단건 + 스키마

# ParamSet
GET    /api/cases/:tcId/param-sets
POST   /api/cases/:tcId/param-sets       { name, params, expected } — 저장 전 스키마 검증
DELETE /api/param-sets/:id

# Execution
POST   /api/runs                         { title, env, repeat?, items: [{ tcId, platforms[], params, expected, timeoutMs?, paramSetId? }] } → { runId }
                                         triggeredBy는 요청에 싣지 않는다. 로그인한 세션에서 채운다 (§7.1)
                                         env는 admin 설정의 대상 서버 키다. 매핑에 없으면 400.
                                         주소는 요청이 싣지 않고 서버가 매핑에서 찾아 test_run.base_url에 박는다
                                         repeat는 요청 최상위에 1개. 회차 수다 (기본 1, 상한 없음)
                                         run_item 수 = 항목 수 × platforms 길이 × repeat. 회차는 attempt에 1부터 들어간다
                                         러너를 기다리지 않고 { runId }를 바로 돌려준다. 실행은 디스패처가 뒤에서 이어간다
POST   /api/runs/:runId/abort            실행 즉시 중단 → { aborted: number }
                                         대기 중 항목은 줄에서 빼고 NA + 사유로 닫는다
                                         진행 중 항목은 러너에 끊어 달라고 한다 (§5.2). 돌아오는 모양은 타임아웃과 같다
                                         test_run.status = ABORTED. 이미 FINISHED·ABORTED면 409
GET    /api/runs?page=                   실행 목록
GET    /api/runs/last-by-case            케이스×디바이스별 마지막 결과 일괄 조회
                                         → { items: [{ tcId, platform, status, historyId, runId, durationMs, finishedAt }] }
GET    /api/runs/:runId                  실행 + 집계 + 항목 목록 + 그 실행으로 만든 증적 목록
                                         → { ...run, counts, items: [...], evidence: [{ id, format, filePath, generatedAt }] }
                                         counts = { total, pass, fail, na, running }. 화면의 집계 배지가 이 값을 쓴다
GET    /api/runs/:runId/items/:historyId 항목 상세 (스텝·검증 문장 포함)
GET    /api/cases/:tcId/history?platform= 케이스별 이력. platform 생략 시 전 디바이스

# 실패 분석 (상세 화면 전용. 증적 문서에는 포함하지 않는다)
GET    /api/cases/:tcId/source?line=     실패 줄 ±5줄 발췌 → { lines: [{no, text}], focus }
GET    /api/screenshots/:runId/:historyId/:seq.png   스크린샷 원본

# Reporting
POST   /api/runs/:runId/evidence         { format } → { id, format, filePath, generatedAt }
GET    /api/evidence/:id                 문서 다운로드
```

### 인증 적용 범위 (2026-09-16 결정)

`POST /api/auth/login`을 뺀 **모든 `/api/**`는 로그인이 필요하다.** 로그인하지 않은 요청은 401이다.
화면은 401을 받으면 로그인 화면으로 보낸다.

**"누구인지 알아내는 부분"과 "그걸로 뭘 하는 부분"을 나눈다.** 아이디·비밀번호를 맞춰 보는 일은
한 함수 뒤에 둔다. 나중에 SSO로 바꿔도 그 함수만 갈아 끼우면 되고,
세션에서 사람을 읽어 쓰는 나머지 코드는 손대지 않는다.
**권한 구분·팀·승인 절차는 지금 하지 않는다.** 자리만 남긴다.

검색 조건 다섯과 화면 규칙은 §8.1에, 나중에 검색엔진으로 갈아 끼울 때의 전제는 §5.3에 있다.
여기에는 질의 문자열과 응답 필드만 적는다.

### 7.1 Execution · 검색 · 인증에 대한 결정 (2026-09-16)

| 무엇 | 정한 것 | 왜 |
|------|--------|-----|
| `triggeredBy` | **요청에 싣지 않는다.** 로그인한 세션의 아이디가 `test_run.triggered_by`로, 그때의 이름이 `test_run.triggered_by_name`으로 들어간다 (2026-09-16 수정) | 화면이 보내는 값은 아무나 적을 수 있어 실행자를 가리지 못한다. 인증이 생겼으므로 요청이 정할 자리가 아니다 |
| `timeoutMs` | 항목마다 생략 가능. 없으면 `300000`. 쓴 값을 `run_item.timeout_ms`에 박제한다 | §10의 `DEMO-007`을 "`timeoutMs`를 5000으로 준 실행"으로 검증하려면 요청에서 정할 수 있어야 한다. 박제하지 않으면 나중에 타임아웃 `NA`를 볼 때 몇 초를 줬는지 알 수 없다 |
| `GET /api/runs/last-by-case` | 끝난 항목만, 케이스×디바이스마다 최신 1건 | §8.1 목록의 `마지막 결과` 칸 때문이다. 케이스마다 이력을 따로 부르면 10건일 때 요청이 11번이 된다. 카탈로그가 `run_item`을 읽으면 컨텍스트 경계가 깨지므로 실행 쪽이 낸다 |
| `env` · `base_url` | 요청은 **키만** 싣는다. 주소는 admin 설정의 `env`→`baseUrl` 매핑에서 찾아 `test_run.base_url`에 박는다 | 요청이 주소를 실으면 아무 데나 쏠 수 있다. 매핑은 바뀌므로 그날 친 주소는 따로 남겨야 한다 |
| `repeat` | 요청 **최상위에 1개**. 기본 1. **상한을 두지 않는다** | 목적은 새로 쓴 테스트 코드가 안정적인지 여러 번 돌려 보는 것이다. 항목마다 두면 `run_item` 개수 계산이 항목별로 갈라져 §8.2의 안내 문구를 못 만든다. 동시 실행 2 제한이 이미 있어 몇 번을 넣든 서버가 죽지 않는다 |
| 자동 재시도 | Playwright의 `retries`는 **0으로 고정한다.** 켜려면 SPEC 변경이 먼저다 | 실패를 가리려고 다시 돌리는 것과, 실패를 드러내려고 여러 번 돌리는 것은 다른 일이다. 반복은 `repeat`가 한다 |
| `POST /api/runs/:runId/abort` | 대기 중 항목은 줄에서 빼고 `NA` + 사유로 닫고, **진행 중 항목도 끊는다.** `test_run.status = ABORTED` | `ABORTED`가 스키마에 있는데 쓰는 코드가 한 줄도 없었다. 대기만 취소하면 5분짜리가 계속 돌아 사용자에게는 멈추지 않은 것으로 보인다 |
| 중단과 결과의 경합 | 결과 되쓰기 UPDATE에 `AND finished_at IS NULL`을 붙인다 | 중단이 닫은 항목에 뒤늦게 도착한 결과가 덮어쓰면 무엇이 진짜인지 알 수 없다. **먼저 온 것만** 기록한다 |
| admin 재기동 복구 | 부팅 직후 `status = 'RUNNING'`인 실행의 미완 항목을 닫고 실행을 `ABORTED`로 바꾼다. 중단과 같은 처리다 | 디스패처는 메모리에만 있다. 재기동하면 이어갈 주체가 없는데 `RUNNING`으로 남아 영원히 도는 것처럼 보인다 |
| 인스턴스 이름 · 테스트 저장소 | 설정으로 받아 `test_run.instance_name`·`test_run.tests_repo`에 박는다. 플랫폼이 저장소에서 직접 받아오지는 않는다 | 인스턴스마다 다른 저장소를 본다. "어디서 무엇을 시험한 것인가"가 증적 문서에 남아야 한다 (§9.2) |
| 검색 조건 | 케이스 속성(글자·기능 영역·디바이스·활성)은 **서버가**, `마지막 결과`는 **화면이** 거른다. 조건 정의는 §8.1이 정본이다 | 마지막 결과는 실행할 때마다 바뀐다. 카탈로그가 `run_item`을 읽으면 컨텍스트 경계가 깨진다 (§3.1) |
| 검색 응답 | `sort`와 `totalIsExact`를 같이 준다 | 나중에 검색엔진을 붙이면 정렬이 관련도순으로 바뀌고 건수가 근사치가 된다. 화면이 지금 모양을 전제하면 그때 깨진다 (§5.3) |
| 로그인 | 아이디·비밀번호 1종. 권한 구분·팀·승인 절차는 만들지 않는다 | 공용 비밀번호 하나는 누가 눌렀는지 못 가린다. 권한 칸은 구분이 실제로 생길 때 만든다 |

`POST /api/runs`가 실행이 끝날 때까지 기다리지 않는 이유도 같은 자리에 적어 둔다.
케이스 1건에 최대 5분을 줄 수 있으므로 기다리면 화면이 그만큼 멈춘다.
끝났는지는 `GET /api/runs/:runId`의 `status`가 `FINISHED`인지로 본다 (§3.2 불변식).

**인증 이전에 쌓인 실행의 실행자는 믿을 수 없다** (2026-09-16 결정).
로그인이 없던 동안 `triggered_by`에는 요청이 적어 보낸 값이나 기본값 `'admin'`이 들어갔다.
그 값을 사람 이름처럼 보여주면 증적 문서가 없는 근거를 만들어 낸다.

**구분 규칙.** `test_run.triggered_by_name`이 `NULL`이면 인증 도입 이전 실행이다.
화면과 증적 문서의 실행자 칸에 **`실행자 미상 (인증 도입 이전)`** 이라고 쓴다.
실행 시각으로 가르지 않는다. 마이그레이션 적용 시각과 배포 시각이 어긋나면
경계에 걸친 실행을 잘못 분류한다.
`triggered_by`에 남아 있는 옛 값은 지우지 않고 그대로 두되 사람 이름 자리에 쓰지 않는다.
지우면 그 자리에 무엇이 있었는지조차 알 수 없어진다.

---

## 8. 화면

모든 화면 맨 위에 **인스턴스 띠**를 둔다 (2026-09-16 결정).

서비스마다 인스턴스를 따로 띄우므로(§9.2) 똑같이 생긴 화면 두 개가 서로 다른 DB를 본다.
잘못된 인스턴스에서 `실행`을 누르는 것을 막는 장치가 이 띠 하나다.

- 띠에 **인스턴스 이름**과 **테스트 저장소 주소**를 적는다.
  브라우저 탭 제목도 `<인스턴스 이름> · 테스트 플랫폼`으로 한다. 탭이 여럿일 때는 탭 글자만 보인다
- 띠의 **바탕색**도 설정으로 받는다. 글씨를 읽지 않아도 색만으로 구분되어야 한다.
  이름만으로는 부족하다 — 글자는 읽어야 보이고, 색은 안 읽어도 구분된다
- 이름·색·저장소 주소는 전부 설정값이다 (§9). 화면이 값을 정하지 않는다
- **인스턴스를 고르는 화면은 만들지 않는다.** 한 인스턴스는 자기 DB와 자기 테스트 폴더만 본다.
  한 화면이 여러 DB를 넘어다니면 접어 둔 멀티테넌시로 되돌아간다 (§1 전제)

### 8.1 케이스 목록
`TC ID | 케이스명(문장형) | 지원 디바이스 | 마지막 결과 | [실행]`
→ JSON 원문은 목록에 절대 노출하지 않는다.
`마지막 결과` 칸은 `GET /api/runs/last-by-case` 한 번으로 전부 채운다 (§7.1).
케이스마다 이력을 따로 부르지 않는다.
목록 위에 `다시 스캔하기` 버튼과 마지막 스캔 시각·결과(추가/갱신/비활성/중복)를 둔다.
스캔이 실패했으면 그 사유를 같은 자리에 보여준다.

#### 검색 조건 다섯 (2026-09-16 결정)

글자 검색은 이미 있다. 여기에 넷을 더해 다섯으로 거른다. **이 표가 검색 조건의 정본이다.**

| # | 조건 | 화면 모양 | 무엇으로 거르나 | 거르는 곳 |
|---|------|----------|---------------|----------|
| 1 | 글자 | 검색창 한 칸 | 케이스명·`tcId` 부분 일치 | 서버 |
| 2 | 기능 영역 | 드롭다운 | `tcId` 접두사(`AUTH`·`PROD`·`ORDER`) | 서버 |
| 3 | 디바이스 | 칩(전체/PC/모바일) | 케이스가 선언한 `platforms` | 서버 |
| 4 | 활성 여부 | 칩(활성만/전체). 기본은 활성만 | `is_active` | 서버 |
| 5 | 마지막 결과 | 칩(전체/통과/실패/미실행) | `GET /api/runs/last-by-case` 응답 | 화면 |

- 조건은 **두 갈래**다. 1~4는 케이스의 속성이라 스캔할 때만 바뀌고, 5는 실행할 때마다 바뀐다
- **1~4만 나중에 검색엔진으로 옮길 수 있다. 5는 옮기지 않는다** — 값이 실행마다 바뀌어 색인이 늘 어긋난다.
  검색엔진을 지금 쓰지 않는 이유는 §1 범위 밖에, 갈아 끼울 때의 전제는 §5.3에, 질의 문자열과 응답 형태는 §7에 있다
- 지금은 케이스 속성을 서버에서 거르고 마지막 결과를 화면에서 겹쳐 거른다.
  카탈로그가 `run_item`을 읽으면 컨텍스트 경계가 깨진다 (§3.1·§7.1).
  케이스가 수백 건이 되어 페이지를 나눠 받게 되면 서버 쪽으로 옮긴다
- 기능 영역 선택지 목록은 카탈로그가 낸다. 화면이 지금 페이지에 뜬 `tcId`에서 뽑으면 페이지를 넘길 때마다 선택지가 달라진다
- 비활성 케이스를 기본으로 감춘다. 코드에서 사라진 케이스는 지우지 않고 남겨 두므로(§3.1) 시간이 지날수록 목록이 과거로 채워진다

#### 목록 화면이 지킬 것 셋 (2026-09-16 결정)

- **목록을 부르는 자리를 한 곳에 모은다.** 화면 여러 곳에서 각자 부르면 갈아 끼울 때 다 찾아야 한다
- **정렬 순서를 화면이 정하지 않는다.** 응답이 준 순서 그대로 그린다.
  순서가 관련도순으로 바뀌는 날, 화면이 `tcId` 순을 전제하면 목록이 뒤죽박죽으로 보인다
- **`모두 N건`을 정확한 값으로 전제하지 않는다.** 이 숫자는 안내로만 쓰고, 다음 페이지가 있는지는 응답이 알려주는 값으로 판단한다.
  **지금 케이스 목록 화면이 이 숫자로 페이지 수까지 계산하고 있다. 이것부터 고친다** — 총건수가 근사치가 되는 날 빈 페이지가 생긴다

### 8.2 실행 설정
선택한 케이스의 `paramSchema`를 읽어 **입력 폼을 자동 생성**한다.
`enum` → 셀렉트, `boolean` → 토글, `optional` → 선택 입력, `describe` → 라벨.
저장된 `ParamSet`을 불러오는 드롭다운 제공.
케이스의 `platforms`에 선언된 **디바이스**만 체크박스로 노출하고, 기본은 전부 선택.
스키마 검증 실패 시 해당 칸 아래에 이유를 표시한다(버튼은 비활성화하지 않는다).

실행 제목 칸은 이미 있고 `<tcId> 실행`으로 미리 채워진다. 계약으로 올려 둔다 —
`POST /api/runs`의 `title`이 필수이고, 실행 목록이 이 제목으로 실행을 가린다.

#### 실행할 때 같이 고르는 것 (2026-09-16 결정)

| 칸 | 모양 | 기본값 | 왜 필요한가 |
|----|------|-------|-----------|
| 디바이스 | 체크박스. 케이스가 선언한 것만 | 전부 선택 | 한 케이스를 PC와 모바일에서 각각 돌린다 |
| 대상 서버 | 드롭다운. admin 설정에 등록된 것만 (개발·QA·스테이징) | 설정에 적힌 기본 서버 | 같은 케이스라도 어느 서버에 쐈는지가 증적의 전제다 |
| 반복 횟수 | 숫자 칸 하나. 1 이상 | 1 | 새로 쓴 테스트가 안정적인지 여러 번 돌려 본다 |
| 실행자 | 고칠 수 없는 표시 칸. 로그인한 사람 이름 | — | 사람이 직접 적게 두면 남의 이름을 적을 수 있다 (§8.6) |

- 대상 서버 이름 옆에 그 서버의 주소를 흐린 글씨로 같이 보여준다. 고른 뒤 "어디로 쏘는지"를 확인할 자리가 있어야 한다.
  주소는 admin 설정이 갖고 있고 화면이 직접 적지 않는다 (§9)
- **반복 횟수는 실행 전체에 하나다.** 항목마다 따로 주지 않는다.
  항목마다 다르면 `실행 항목이 N건 생깁니다`를 계산할 수 없다
- 반복 횟수에 상한을 두지 않는다. 동시 실행 2 제한이 이미 있어 서버가 밀리지 않는다.
  다만 2 이상을 고르면 `실행 항목이 N건 생깁니다`(디바이스 수 × 횟수)를 버튼 옆에 적는다.
  실수로 큰 수를 넣은 것을 누르기 전에 알아야 한다
- 반복은 **테스트 코드를 검증하려는 것**이지 실패를 가리려는 것이 아니다. 자동 재시도와 혼동하지 않는다 → §5.2

#### 비밀값 칸 (2026-09-16 결정)

`paramSchema`의 어떤 칸에 비밀값 꼬리표가 붙어 있으면(→ §4.1) 화면은 그 칸을 가려서 입력받는다.
타이핑하는 동안 글자가 점으로 보이는 칸이다.

- 저장된 `ParamSet`을 불러왔을 때도 가려진 채로 채운다. 화면 어디에서도 그 값을 글자로 되돌려 보여주지 않는다
- **가리는 것은 보이는 것뿐이다.** 값은 그대로 서버로 간다. 저장 시점에 가리면 같은 값으로 다시 실행할 수 없고
  실패 원인도 볼 수 없다. 테스트 전용 계정에 그것은 과한 대응이다
- 어깨너머로 보는 것을 막는 것이 이 칸의 목적이다. 이 칸은 DB 보호 장치가 아니다

### 8.3 실행 결과 목록
케이스 1건 = 1행. 디바이스별 결과는 판정 칸에 나란히 묶어 보여준다.

`TC ID | 케이스명 | PC 판정 | 모바일 판정 | [상세]`

디바이스별로 행을 쪼개지 않는 이유는 목록 길이가 두 배가 되고,
"PC는 되는데 모바일만 깨짐"이 한 줄에서 안 보이게 되기 때문이다.
지원하지 않는 디바이스의 칸은 `—`로 비운다.
필터는 판정(전체/PASS/FAIL/NA) + 디바이스(전체/PC/모바일) 둘이다.

**소요시간은 독립 칸으로 두지 않는다** (2026-09-16 결정). 디바이스별 판정 배지 아래에 각각 적는다.
디바이스가 둘인 행에서 소요시간이 하나면 어느 쪽 것인지 알 수 없다.

RUN 머리에 실행 제목·실행 시각·실행자·대상 서버와 주소를 한 줄로 적는다.
이 값들은 실행에 박제된 것을 읽는다 (§6 `test_run`).
대상 서버가 빠지면 같은 케이스의 통과 두 건이 같은 조건으로 보인다.

아직 안 끝난 항목의 `도는 중` 배지와 2초마다 다시 묻는 자동 갱신은 **이미 만들어져 있다.**
여기에 `ABORTED`를 멈춤 조건으로 더한다 (2026-09-16 결정).
지금 조건이 `status !== 'FINISHED'`라, 중단 기능이 들어오면 중단된 실행에서 갱신이 영원히 멈추지 않는다.

#### 실행 멈추기 (2026-09-16 결정)

실행이 도는 중일 때만 RUN 머리에 `실행 멈추기` 버튼을 둔다. 끝난 실행에는 보이지 않는다.
되돌릴 수 없으므로 누르면 한 번 더 묻는다.

- **대기 중인 항목과 이미 돌고 있는 항목을 둘 다 끊는다.** 대기 중인 것만 취소하면
  5분짜리 케이스가 도는 중에는 버튼이 아무 일도 안 하는 것처럼 보인다. 러너에 끊으라고 알리는 통로는 §5.2다
- 멈춘 실행은 머리에 `중단됨`을 달고, 돌지 못한 항목은 미실행 배지 옆에 사유(`사용자가 멈춤`)를 적는다.
  사유 없이 미실행으로 두면 러너 고장과 구분되지 않는다
- 버튼을 보일지 말지도, 자동 갱신을 멈출지 말지도 같은 값(`status`)으로 정한다. 화면이 따로 상태를 들지 않는다

#### 회차 요약 (2026-09-16 결정)

반복 횟수를 2 이상으로 준 실행에서는 한 케이스·한 디바이스에 항목이 여러 건 쌓인다.
**행 구조는 바꾸지 않는다.** 판정 칸이 요약이 된다.

| 회차 | 판정 칸 |
|------|--------|
| 1회 | 지금과 같은 판정 배지 |
| N회 전부 통과 | `5/5 통과` (통과 색) |
| N회 중 하나라도 실패 | `3/5 통과` (실패 색) |

- 다섯 번 중 세 번만 통과한 테스트는 **믿을 수 없는 테스트**다. 통과 색으로 칠하지 않는다
- 소요시간은 회차 평균을 적고 옆에 `평균`을 붙인다. 회차마다 값이 다른데 하나만 적으면 어느 회차 것인지 알 수 없다
- 어느 회차가 깨졌는지는 상세에서 본다. 목록은 회차를 펼치지 않는다

#### 어떤 값으로 돌린 결과인지 목록에서 바로 본다 (2026-09-16 결정)

케이스명 아래에 그 항목이 실제로 쓴 입력값과 기대값을 한 줄로 적는다.
상세로 들어가야만 보이면 "어떤 값에서 깨졌는가"를 줄 사이에서 비교할 수 없다.

- **사람이 읽을 라벨로 적는다.** `아이디 testuser · 응답 코드 200` 처럼 라벨과 값을 붙여 쓴다. JSON 원문을 그대로 붙이지 않는다
- 라벨과 값은 **항목에 박제된 스냅샷**에서 읽는다 (§3.3). 카탈로그의 지금 스키마에서 읽으면
  설명 문구를 고쳤을 때 과거 행의 라벨이 따라 바뀐다
- 비밀값 꼬리표가 붙은 칸은 `********`로 적는다 (§4.1)
- 한 줄을 넘으면 뒤를 `…`로 자른다. 전부는 상세에서 본다
- 입력값이 없는 케이스(`params: null`)는 이 줄을 아예 만들지 않는다. `입력 없음`을 모든 행에 적으면 목록이 시끄러워진다

§8.1의 "JSON 원문을 목록에 노출하지 않는다"는 케이스 목록 규칙이고 여기에는 적용되지 않는다.
라벨과 값을 붙여 쓴 한 줄은 JSON 원문이 아니다.

### 8.4 항목 상세 — 명세 기반 포맷
```
AUTH-002  유효한 이메일과 비밀번호로 로그인하면 토큰이 발급된다   [모바일]  [FAIL]

사전조건   · 가입 완료된 사용자 계정이 존재한다
           · 계정이 잠금 상태가 아니다

입력       아이디      testuser
           비밀번호    ********

시험 절차
  1. 로그인 API를 호출한다                                    PASS  (312ms)
       ✓ 응답 코드가 정상이다          기대 200      실제 200
  2. 토큰을 검증한다                                          FAIL  (88ms)
       ✗ 토큰이 발급된다               기대 true     실제 false

       [스크린샷 썸네일 — 클릭 시 원본]

       ▸ 실패 지점 코드                                    (접힌 상태가 기본)
           18  const body = await res.json();
           19  await verify('토큰이 발급된다', !!body.token, expected.hasToken);
           20  await verify('유효기간이 3600초다', body.expiresIn, 3600);
```

스크린샷은 실패한 검증 문장 바로 아래에 둔다. 스텝 헤더가 아니라 문장 아래다.
어느 확인에서 깨졌는지와 그때 화면이 나란히 붙어야 의미가 있다.
실행을 멈추게 한 검증 문장(`blocker`)에는 옆에 `실행 중단`을 표시한다. 그 뒤 절차가 왜 없는지 설명이 필요하다.

**코드 뷰**는 실패한 스텝에만, 접힌 상태로, 상세 맨 아래가 아니라 해당 스텝 안에 둔다.
이 플랫폼의 전제는 "코드를 몰라도 쓴다"이므로 기본 노출은 하지 않는다.
증적 문서에는 코드와 `httpTrace`를 넣지 않는다 — 스크린샷만 들어간다.

증적 문서는 **실행(run) 단위로 1부**다. 항목(`history_id`)마다 위 블록이 반복되고,
디바이스가 2개인 케이스는 디바이스별로 2번 나온다. 화면의 상세는 항목 1건, 문서는 항목 전부 — 블록 모양은 같다.
반복 실행한 케이스는 회차마다 한 블록씩 나온다. 회차 번호를 블록 머리에 적는다.

#### 증적 문서 머리말 (2026-09-16 결정)

문서 맨 앞에 **인스턴스 이름**과 **테스트 저장소 주소**를 적는다.
그 아래에 실행 제목·실행 시각·실행자·대상 서버와 주소를 적는다.

- 이 값들은 한 번의 실행 전체에 걸린 사실이라 **실행에 박제된 값**을 읽는다 (§6 `test_run`). 항목마다 반복될 값이 아니다
- 저장소 주소가 없으면 "무엇을 시험한 것인가"가 문서에 남지 않는다. 인스턴스마다 다른 저장소를 보므로
  문서만 떼어 놓으면 알아낼 방법이 없다
- 실행자 이름이 비어 있으면 `실행자 미상 (인증 도입 이전)`, 정기 실행이면 `스케줄러`로 적는다 (§3.5)

#### 증적 문서 만들기·받기 (2026-09-16 결정)

지금까지 증적 문서에 관한 문장만 있고 누를 것이 없었다.
증적은 실행 단위 1부이므로 버튼은 항목 상세가 아니라 **실행 결과 목록(§8.3)의 RUN 머리**에 둔다.

| 지금 상태 | 버튼 |
|----------|------|
| 실행이 도는 중 | 누를 수 없다. 옆에 `실행이 끝나면 만들 수 있습니다`를 적는다 |
| 끝났고 문서가 없다 | `증적 문서 만들기` → `POST /api/runs/:runId/evidence` |
| 만드는 중 | `만드는 중입니다`로 바꾸고 다시 눌리지 않게 한다 |
| 만들어졌다 | `증적 문서 받기` → `GET /api/evidence/:id`. 옆에 만든 시각을 적는다 |

- 버튼으로 내는 형식은 **PDF 하나**다. HTML은 사람이 제출하는 물건이 아니라 PDF를 만드는 중간 산물이다 (§3.3).
  엑셀은 **검수처가 주는 양식을 받아 본 뒤** 표 모양을 정한다 → §1.1
- 이미 만든 문서가 있어도 다시 만들 수 있다. **같은 실행의 증적은 언제 뽑아도 같은 문서가 나오므로**(§3.3 박제 규칙)
  다시 만들어도 내용이 달라지지 않는다. 만든 시각만 새로 적힌다
- 중단된 실행(`ABORTED`)도 만들 수 있다. 돌지 못한 항목은 미실행과 사유로 문서에 남는다.
  "여기까지 돌았고 나머지는 사람이 멈췄다"가 증적으로 성립한다

### 8.5 대시보드 (Grafana)
성공률 추이 / 평균 소요시간 / 실패 TOP 10 케이스 / 최근 실행 목록.
Postgres 데이터소스로 `run_item`을 직접 조회한다.

성공률 추이는 **정기 실행이 있어야 선이 된다** (2026-09-16 결정).
사람이 누를 때만 돌면 점 몇 개가 흩어질 뿐이라 추이가 아니고, 그 점은 품질이 아니라 근무 시간을 그린다.
거는 자리는 §9.2다. 테스트 대상이 아직 데모 사이트여도 켠다 — 지표의 내용보다 **장치가 도는지 검증**하는 것이 지금 목적이다.

### 8.6 로그인 화면 (2026-09-16 결정)

아이디 칸, 비밀번호 칸, `로그인` 버튼. 그 밖에 아무것도 없다.

- 로그인하지 않은 채로 다른 화면 주소를 열면 이 화면으로 보낸다. 로그인하면 원래 가려던 화면으로 돌려보낸다
- 비밀번호 칸은 가려서 입력받는다 (§8.2의 비밀값 칸과 같은 모양)
- 실패하면 `아이디 또는 비밀번호가 맞지 않습니다` 한 문장만 보여준다.
  어느 쪽이 틀렸는지 알려주면 밖에서 아이디가 있는지 없는지를 하나씩 확인할 수 있다
- 화면 오른쪽 위에 로그인한 사람 이름과 `로그아웃`을 둔다. §8.2의 실행자 칸에 들어가는 이름이 이 이름이다
- 회원가입 화면은 없다. 계정은 운영자가 만든다 (§9.2)

#### 공용 비밀번호 하나로 하지 않는 이유

비밀번호 하나를 여럿이 나눠 쓰면 실행자를 가릴 수 없다. 실행자 값이 전부 같아지고
증적 문서의 실행자 칸이 "누가 돌렸는지"를 말하지 못한다. 그러면 로그인을 붙인 의미가 없다.

#### 지금 하지 않는 것

권한 구분·팀·승인 절차는 넣지 않는다. **화면에 자리도 만들지 않는다.**
누를 수 없는 메뉴가 있으면 사람이 그것이 올 때까지 기다린다.

#### 인증 없이 들어오는 실행 (2026-09-16 결정)

정기 실행은 사람이 아니라 서버의 예약 기능이 건다. 로그인 화면을 쓸 수 없다.

- **인증 없이 부를 수 있는 것은 `POST /api/runs` 하나뿐이다.** 나머지는 전부 로그인이 필요하다
- 그렇게 들어온 실행은 실행자가 **반드시 `스케줄러`로 기록되고 사람 이름을 실을 수 없다.**
  그래서 이 통로로는 **남의 이름을 사칭할 수 없다.** 증적이 지키려는 것이 정확히 그것이다

#### 인증이 생기기 전에 쌓인 실행

인증 이전 실행의 실행자 값은 요청이 적어 보낸 글자이거나 기본값이라 믿을 수 없다.
그 값을 사람 이름인 척 보여주면 증적이 거짓말을 한다.

- 화면과 증적 문서 모두 실행자 칸에 `실행자 미상 (인증 도입 이전)`으로 적는다
- **구분 기준은 실행자 이름 칸이 비어 있는지다** (§6). 날짜로 가르면 마이그레이션 적용 시각과
  배포 시각이 어긋날 때 경계에 걸친 실행을 잘못 분류한다
- 과거 행을 고쳐 쓰지 않는다. 고쳐 쓰면 어느 것이 진짜였는지 영영 알 수 없다

---

## 9. 인프라

```yaml
# docker-compose.yml (구조만)
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    ports: ["${POSTGRES_PORT:-5433}:5432"]    # 바깥 포트는 .env로 뺀다 (§9.2 인스턴스 복제)
    volumes: ["pgdata:/var/lib/postgresql/data"]
  admin:
    build: ./apps/admin               # FROM mcr.microsoft.com/playwright:<버전>-jammy (증적 PDF용 브라우저)
    restart: unless-stopped           # 재부팅 뒤 스스로 돌아온다. 기동 시 중단 복구가 돈다 (§3.2)
    ports: ["${ADMIN_PORT:-3000}:3000"]
    depends_on: [postgres]
    environment:
      PLATFORM_INSTANCE_NAME:  "${PLATFORM_INSTANCE_NAME}"    # 화면 띠·탭 제목·증적 머리말 (§8)
      PLATFORM_INSTANCE_COLOR: "${PLATFORM_INSTANCE_COLOR}"   # 띠 바탕색. 안 읽어도 구분되게
      PLATFORM_TESTS_REPO:     "${PLATFORM_TESTS_REPO}"       # 적어 두기만 한다. 받아오지 않는다
      PLATFORM_ENV_URLS:       "${PLATFORM_ENV_URLS}"         # 대상 서버 이름→주소 표 (§9)
    volumes:
      - "./tests:/tests:ro"           # 스캔과 실패 지점 코드 발췌가 소스를 읽는다
      - "artifacts:/artifacts"        # 스크린샷 서빙, 증적 문서 저장
  runner:
    build: ./apps/runner              # FROM mcr.microsoft.com/playwright:<버전>-jammy
    restart: unless-stopped
    # 바깥 포트를 열지 않는다. admin이 컨테이너 네트워크 안에서만 부른다.
    # 러너에는 로그인이 없어 포트가 열려 있으면 인증을 건너뛰는 뒷길이 된다 (§3.5)
    volumes:
      - "./tests:/tests:ro"           # 테스트 소스 읽기 전용 마운트
      - "artifacts:/artifacts"        # 스크린샷 공유 볼륨 (admin과 공유)
    mem_limit: 4g                     # 폭주해도 admin을 끌고 내려가지 않게
  grafana:
    image: grafana/grafana
    restart: unless-stopped
    ports: ["${GRAFANA_PORT:-3001}:3000"]
    depends_on: [postgres]
    volumes: ["./infra/grafana/provisioning:/etc/grafana/provisioning:ro"]   # WS-D가 채운다
volumes:
  pgdata: {}
  artifacts: {}
# 마이그레이션은 한 번 돌고 끝나는 일회성이라 restart를 붙이지 않는다
```

```
[계약 변경 필요]
대상:    docker-compose.yml · apps/admin/Dockerfile (Phase 0 잠금 파일)
현재:    바깥 포트가 "3000:3000" · "4000:4000" · "3001:3000" · "5433:5432"로 숫자가 박혀 있다.
         restart 정책이 없다. 인스턴스 이름·색·저장소를 넘길 자리가 없다.
         admin 이미지 안에 화면 빌드 단계가 없어 컨테이너로는 화면이 안 뜬다
제안:    바깥 포트를 .env 값으로 뺀다. 러너의 ports를 지운다.
         상시 서비스 넷에 restart: unless-stopped를 붙인다.
         admin에 인스턴스 이름·색·저장소·대상 서버 표를 환경변수로 넘긴다.
         apps/admin/Dockerfile에 화면 빌드 한 줄을 넣는다
이유:    포트가 박혀 있으면 한 서버에서 인스턴스를 둘 못 띄운다. 러너 포트가 열려 있으면
         로그인을 건너뛰는 뒷길이 된다. 화면 빌드가 없으면 컨테이너가 API만 내고 화면은 빈 화면이다
영향:    WS-0(공용 골격), WS-E(화면이 인스턴스 값을 읽는다), WS-B(대상 서버 표를 읽는다)
```

- 대상 서버: 2 vCPU / 16GB EC2 (Ubuntu)
- 동시 실행 2 고정 (Execution 디스패처). CPU가 2코어이므로 그 이상은 느려지기만 한다.
  Playwright 프로세스 하나는 케이스 1건만 돌리므로 `workers: 1`이다
- 러너와 admin 둘 다 Playwright 공식 이미지를 쓴다 (시스템 라이브러리 문제 회피. admin은 PDF용).
  이미지 태그와 `@playwright/test` 버전은 **정확히 같아야** 한다. 다르면 브라우저 바이너리를 못 찾는다
- 러너와 admin은 바깥 인터넷(HTTPS)으로 나갈 수 있어야 한다. 데모 대상이 공개 사이트다 (§10)
- `/tests`는 읽기 전용이라 그 안에 `node_modules`를 둘 수 없다. 러너 이미지가
  `@playwright/test`·`@platform/kit`·`zod`를 `/tests` 밖에서 resolve 되게 갖고 있어야 한다
- 스크린샷은 러너와 어드민이 **공유 볼륨**에 둔다.
  경로 규칙: `artifacts/runs/{runId}/{historyId}/{seq}.png`
  러너가 쓰고 어드민이 `/api/screenshots/...`로 서빙한다. 러너는 DB를 여전히 모른다
- 증적 문서는 `artifacts/evidence/{runId}/{id}.{html|pdf}`에 둔다. `evidence_document.file_path`가 이 경로다
- Grafana는 읽기 전용 DB 계정으로 붙는다. 계정은 Phase 0에서 만든다 (마이그레이션 또는 postgres init 스크립트)
- **바깥 포트는 전부 `.env`(컨테이너에 넘길 설정값을 적어 두는 파일)의 값으로 뺀다.** 기본값은 지금 쓰는 숫자 그대로다.
  서비스마다 인스턴스를 따로 띄우므로(§9.2) 숫자가 박혀 있으면 한 서버에서 둘째 인스턴스가 뜨지 않는다
- **러너는 바깥 포트를 열지 않는다.** admin만 컨테이너 네트워크 안에서 `http://runner:4000`으로 부르면 된다.
  러너에는 로그인이 없으므로 4000이 열려 있으면 admin의 로그인 화면을 지나지 않고 아무나 테스트를 돌릴 수 있다
- **상시 서비스 넷(postgres·admin·runner·grafana)에 `restart: unless-stopped`를 붙인다.**
  서버가 재부팅돼도 사람이 손대지 않고 돌아온다. DB가 안 뜨면 admin의 재기동 복구(§3.2)도 돌지 못한다.
  마이그레이션은 한 번 돌고 끝나는 일회성이므로 붙이지 않는다 — 붙이면 끝날 때마다 다시 뜬다
- **admin 이미지는 안에서 화면을 빌드한다.** `apps/admin/Dockerfile`에 화면 빌드 한 줄이 들어간다.
  `.dockerignore`(이미지를 만들 때 복사하지 않을 파일을 적어 두는 목록)가 `**/dist`를 막고 있어
  호스트에서 빌드한 산출물은 이미지에 들어가지 않는다. 이 단계가 없으면 컨테이너는 API만 내고 화면 주소는 빈 화면이 된다.
  `.dockerignore`는 그대로 둬도 된다 — 이미지 안에서 만든 파일은 복사를 타지 않는다
- **인스턴스 이름·색·테스트 저장소 주소를 설정으로 받는다**
  (`PLATFORM_INSTANCE_NAME`·`PLATFORM_INSTANCE_COLOR`·`PLATFORM_TESTS_REPO`).
  화면 띠와 탭 제목, 증적 문서 머리말이 이 값을 쓴다 (§8·§8.4).
  저장소 주소는 **적어 두기만 하고 플랫폼이 거기서 코드를 받아오지 않는다**
- **대상 서버 이름과 주소를 묶은 표는 설정으로 둔다** (`PLATFORM_ENV_URLS`, 예: `dev=https://dev.example.com,qa=https://qa.example.com`).
  파일이나 DB 표로 만들지 않는다 — 인스턴스마다 서버가 두셋뿐이고, 바뀌면 재기동하면 된다 (2026-09-16 결정).
  §8.2의 드롭다운 선택지와 §7의 주소 채우기가 이 한 값을 본다
- 위 설정은 인스턴스마다 한 번 정하면 바뀌지 않는 값이다. 이와 달리 `PLATFORM_BASE_URL`은
  **실행마다 러너가 자식 프로세스에 넘기는 값**이라 `.env`에 두지 않는다 (§5.2). 두 종류를 섞지 않는다

### 9.1 기술 스택 (2026-09-16 확정)

| 층 | 선택 | 비고 |
|----|------|------|
| 언어·런타임 | TypeScript, Node 20 이상, npm workspaces 모노레포 | Node 버전은 Playwright 이미지에 든 것을 따른다 |
| admin 서버 | Fastify | 컨텍스트별 `routes.ts`를 플러그인으로 등록한다 (WORKSTREAMS 공용 골격) |
| 화면 | React + Vite | `apps/admin/src/web/**`가 Vite 프로젝트. 빌드 산출물을 admin이 `/`에서 정적 서빙, API는 `/api/**` |
| DB 접근 | `pg` + 순수 SQL | ORM 없음. spec-review가 컬럼명을 grep으로 확인할 수 있어야 한다 |
| 마이그레이션 | SQL 파일 + dbmate | `db/migrations/*.sql`. compose의 일회성 서비스로 적용한다 |
| 명세·검증 | zod (JSON Schema 변환은 zod 내장 `z.toJSONSchema`) | §4. `zod-to-json-schema`는 zod 4에서 못 쓰므로 의존성에서 지운다 (2026-09-16 결정) |
| 단위 테스트 | Vitest | 각 앱 안 `*.test.ts`. `tests/**`는 Playwright 전용 |
| E2E·데모 | Playwright | `tests/**` |
| PDF | Playwright `page.pdf()` | admin 안에서 (§3.3) |

여기 없는 것을 쓰려면 CLAUDE.md §3 대로 먼저 묻는다.

#### 승인받은 새 부품 1개 (2026-09-16)

§3.5 로그인을 만들려면 아래가 필요하다.

| 층 | 무엇 | 하는 일 | 왜 직접 만들지 않나 |
|----|------|--------|------------------|
| 로그인 상태 유지 | Fastify의 쿠키·세션 플러그인 | 로그인한 사람이 누구인지를 요청마다 알아내는 쿠키(브라우저가 서버 대신 들고 다니는 작은 표) 처리 | 서명·만료·재사용 방지를 직접 짜면 틀리기 쉽고, 틀리면 남의 계정으로 들어가진다 |

**비밀번호 해시는 새 부품이 필요 없다.** Node에 이미 들어 있는 `crypto.scrypt`로 되는 것을
이 저장소의 Node로 실제 돌려 확인했다 (2026-09-16). 해시 생성·같은 값 일치·다른 값 불일치·
안전한 비교(`timingSafeEqual`)가 전부 내장으로 된다. 그래서 새로 까는 부품은 **하나**다.

```
[계약 변경 필요]
대상:    각 package.json (Phase 0 잠금 파일)
현재:    인증에 쓸 부품이 없다
제안:    Fastify 쿠키·세션 플러그인을 더한다. 비밀번호 해시는 Node 내장 crypto.scrypt를 쓰므로 추가 설치가 없다
이유:    §3.5 로그인 없이는 실행자를 가릴 수 없고 증적의 실행자 칸이 거짓이 된다
영향:    WS-0(공용 골격), WS-B(인증 미들웨어), §7(인증 API), §8.6, §9.2
```

### 9.2 운영 (2026-09-16 결정)

#### 정기 실행

§8.5의 성공률 추이 패널은 같은 케이스가 **주기적으로 돌아야** 성립한다.
사람이 누를 때만 돌면 점이 흩어질 뿐이고, 그 점은 품질이 아니라 사람의 근무 시간을 그린다.

**테스트 대상이 아직 데모 사이트여도 켠다.** 지표의 내용보다 **장치가 실제로 도는지 검증**하는 것이 지금 목적이다.
성공률 추이 패널이 그려지는지, 인증 없는 실행 경로가 도는지, 불안정한 케이스가 드러나는지가 여기서 확인된다.

- 매일 **새벽** 활성 케이스 전부를 한 번 돌린다. 사람이 쓰는 시간과 겹치면 동시 실행 2를 나눠 쓰게 된다
- 값은 **케이스 코드에 적힌 기본값**으로 돈다. 사람이 채워야만 도는 케이스가 없도록 §4 K10이 강제한다.
  저장된 입력값 묶음에 이름 약속을 만들지 않는다 — 진실의 원천은 코드다 (§3.1)
- 실행 제목은 `정기 실행 <날짜>`, 대상 서버는 `demo`, 반복 횟수는 1이다.
  반복은 테스트 코드를 검증하는 도구지 추이를 만드는 도구가 아니다 (§8.2)
- **실행자는 `스케줄러`다.** 사람이 아니므로 사람 이름을 받지 않는다 (§3.5)
- **거는 자리는 서버의 `cron`(정해진 시각에 명령을 자동으로 돌려 주는 리눅스 기본 기능)이고,
  하는 일은 `POST /api/runs`를 한 번 부르는 것뿐이다.** admin 안에 스케줄러를 넣지 않는다 —
  컨테이너가 재기동될 때마다 다음 실행 시각이 흔들리고, 인스턴스가 여럿이면 스케줄러도 여럿이 된다.
  나중에 화면에서 "무엇을 몇 시에"를 고르고 싶어지면 그때 스케줄 표를 만든다

#### 배포 절차

배포는 한 줄이다.

```
git pull && docker compose up -d --build
```

- 마이그레이션은 compose의 일회성 서비스가 admin보다 먼저 돈다. 사람이 따로 칠 것이 없다
- admin은 기동할 때 카탈로그를 한 번 스캔하므로(§3.1) 배포 직후 케이스 목록이 최신이 된다
- 도는 실행이 있는 중에 배포하면 그 실행은 끊긴다. admin이 부팅 직후 미완 항목을 닫고 `ABORTED`로 바꾼다 (§3.2).
  끊긴 실행이 영원히 `도는 중`으로 남는 것보다 낫다

#### 계정 만들기

회원가입 화면은 없다 (§8.6). 계정은 운영자가 admin 컨테이너 안에서 명령 한 번으로 만든다.

```
docker compose exec admin node scripts/add-user.js <아이디> <이름>
```

비밀번호는 이 명령이 무작위로 만들어 화면에 한 번 찍고 다시 보여주지 않는다.
명령 인자로 비밀번호를 받으면 서버의 명령 이력에 평문으로 남는다.
이 스크립트를 admin 안 어느 경로에 둘지는 공용 골격을 맡은 갈래가 정한다.

정기 실행은 계정이 필요 없다. 인증 없이 들어와 `스케줄러`로 기록된다 (§3.5).

#### 인스턴스를 하나 더 만들 때 바꿀 것 여섯

**서비스마다 인스턴스를 따로 띄운다. DB도 따로다.** 그래서 한 인스턴스 안에서는 `tcId`가 여전히 전역 유일이고(§3.1),
프로젝트·팀·소유자 같은 축을 만들 필요가 없다.

코드는 이미 설정으로 갈린다 (`DATABASE_URL`·`RUNNER_URL`·`PLATFORM_TESTS_DIR`·`PLATFORM_ARTIFACTS_DIR`·`EXECUTION_CONCURRENCY`·`PORT`).
복제할 때 바꿀 것은 여섯이다.

| # | 바꿀 것 | 어디서 | 왜 |
|---|--------|-------|-----|
| 1 | 바깥 포트 | `.env`의 `ADMIN_PORT`·`GRAFANA_PORT`·`POSTGRES_PORT` | 한 서버에서 둘이 같은 포트를 못 쓴다 |
| 2 | DB 주소 | `.env`의 `DATABASE_URL` | 인스턴스마다 DB가 따로다 |
| 3 | 테스트 폴더 | compose의 `./tests` 마운트 원본 경로 | 그 서비스의 테스트 저장소를 가리킨다 |
| 4 | 인스턴스 이름 | `.env`의 `PLATFORM_INSTANCE_NAME` | 화면 띠·탭 제목·증적 머리말에 나온다 (§8) |
| 5 | 인스턴스 색 | `.env`의 `PLATFORM_INSTANCE_COLOR` | 글씨를 안 읽어도 색으로 구분된다 (§8) |
| 6 | 테스트 저장소 주소 | `.env`의 `PLATFORM_TESTS_REPO` | "무엇을 시험한 것인가"가 문서에 남아야 한다 (§8.4) |

3과 6은 같은 저장소를 가리키지만 하는 일이 다르다. 3은 실제로 읽어 올 폴더이고 6은 **적어 두기만 하는 주소**다.
플랫폼이 저장소에서 코드를 직접 받아오지는 않는다 — 받아오기 시작하면 이 플랫폼이 배포 서버가 된다.

띄울 때 프로젝트 이름을 준다.

```
docker compose -p <서비스이름> up -d
```

---

## 10. 데모용 테스트 자산

플랫폼 개발·검증을 위한 **가짜 테스트 10건**. 실제 서비스가 아니라 공개 데모 대상을 쓴다 (2026-09-16 결정).

- 브라우저 케이스: `https://demo.playwright.dev/todomvc`
- API 케이스: `https://jsonplaceholder.typicode.com`
- `DEMO-007`(타임아웃)은 외부 사이트에 기대지 않는다. `timeoutMs`를 5000으로 준 실행에서
  `page.waitForTimeout(60_000)`으로 러너의 타임아웃 처리(§5.2)를 검증한다

| tcId | `platforms` | 목적 |
|------|------------|------|
| `DEMO-001` | `['desktop']` | 단순 PASS |
| `DEMO-002` | `['desktop']` | 의도적 FAIL (실패 표시 확인) |
| `DEMO-003` | `['desktop']` | 파라미터 3개 (폼 생성 확인) |
| `DEMO-004` | `['desktop']` | `enum` 파라미터 (드롭다운 확인) |
| `DEMO-005` | `['desktop']` | `optional` 파라미터 |
| `DEMO-006` | `['desktop']` | 스텝 3단 (절차 표시 확인) |
| `DEMO-007` | `['desktop']` | 타임아웃 (에러 처리 확인) |
| `DEMO-008` | `['desktop','mobile']` | **디바이스 2개.** 한 케이스에서 run_item 2행이 생기는지 확인 |
| `DEMO-009` | `['desktop','mobile']` | **디바이스별 결과 분기.** PC는 통과, 모바일은 실패하도록 작성 |
| `DEMO-010` | `['mobile']` | 모바일 전용 케이스. PC 칸이 `—`로 비는지 확인 |

`DEMO-008`~`DEMO-010`이 디바이스 축을 검증하는 3건이다. 이게 없으면
"묶어서 보여주기" 화면과 디바이스별 이력 추적을 개발 중에 확인할 방법이 없다.

Playwright `projects` 설정은 `desktop`(Chromium 데스크톱)과
`mobile`(`devices['iPhone 14']`) 2개로 시작한다. 프로젝트 이름은
`Platform` 타입 값과 **철자까지 일치**해야 한다. 러너가 그대로 넘긴다.

---

## 11. 완료 기준

### Phase 0 — 골격 (단독 세션)
- [ ] `docker compose up`으로 4개 컨테이너가 뜬다
- [ ] 마이그레이션이 적용되고 §6 테이블이 전부 존재한다
- [ ] `packages/kit`의 §5.1 타입이 컴파일된다
- [ ] `GET /health`가 러너에서 200을 반환한다
- [ ] 데모 테스트 10건이 작성되어 있다 (디바이스 2개 케이스 포함)
- [ ] 러너 컨테이너 안에서 `npx playwright test`로 `DEMO-001`이 **실제로** 돈다
      (브라우저 기동, `/tests` 읽기 전용 마운트, 모듈 해석이 여기서 검증된다)
- [ ] **가장 얇은 관통**: 케이스 1건을 하드코딩으로 실행해 `run_item`에 결과가 1행 쌓인다.
      러너 스텁의 가짜 응답으로는 관통이 아니다. 실제 실행의 exit code로 PASS/FAIL을 만든다

### Phase 1 — 병렬 5갈래 (WORKSTREAMS.md 참조)
- [ ] 화면에서 케이스 검색 → 값 입력 → 실행 → 결과 상세까지 클릭으로 완주
- [ ] 코드 수정·재배포 없이 파라미터를 바꿔 다시 실행 가능
- [ ] 실패한 검증 문장이 화면에 문장으로 표시됨
- [ ] 디바이스 2개를 선택해 실행하면 결과가 디바이스별로 나뉘어 한 행에 묶여 표시됨
- [ ] 실패한 스텝에 스크린샷이 자동으로 붙고 화면에서 열림
- [ ] 실패 지점 코드가 ±5줄로 펼쳐짐
- [ ] 증적 문서 PDF가 §8.4 포맷으로 생성됨 (코드·httpTrace 제외, 스크린샷 포함)
- [ ] `npm run check:tests`가 CI에서 통과함 (§4 케이스 파일 규칙 K1~K10)
- [ ] Grafana에 성공률 추이가 그려짐

### Phase 2 — 완제품화 (2026-09-16 결정분)

실제 서비스에 붙이기 전에 전부 초록불이어야 한다. 각 항목은 **사용자가 화면에서 직접 확인할 수 있는 문장**으로 적는다. 코드를 열어야 아는 기준은 완료 기준이 아니다.

- [ ] 같은 실행의 증적을 오늘 뽑든 한 달 뒤에 뽑든 **글자 하나까지 같다.** 케이스의 입력칸 설명 문구를 고친 뒤 과거 실행의 증적을 다시 뽑아 확인한다
- [ ] 비밀값이 화면과 증적 문서에서 가려져 나온다. 입력칸도 타이핑할 때 글자가 보이지 않는다
- [ ] 칸 이름이 비밀번호처럼 보이는데 비밀값 꼬리표를 안 단 케이스 파일을 만들면 `npm run check:tests`가 막는다
- [ ] 값을 반드시 받아야 하는 칸이 남아 있는 케이스 파일을 만들면 `npm run check:tests`가 막는다 (정기 실행이 값 없이 돌 수 있어야 한다)
- [ ] 화면과 문서의 축 이름이 **디바이스**·**대상 서버**로 나온다. 코드의 `platform`·`desktop`·`mobile`은 그대로다
- [ ] 대상 서버를 고르지 않으면 실행이 시작되지 않는다. 실행 기록에 그날 실제로 친 주소가 남는다
- [ ] 반복 횟수를 5로 주고 실행하면 결과가 5건 쌓이고, 결과 목록의 판정 칸이 `5/5 통과`·`3/5 통과`처럼 요약으로 보인다. 행 개수는 늘지 않는다
- [ ] 실행 중에 중단을 누르면 **대기 중인 것과 진행 중인 것이 모두** 멈추고, 실행 상태가 `ABORTED`가 된다. 그 실행의 화면 자동 갱신도 멈춘다
- [ ] admin을 강제로 재기동해도 `RUNNING`인 채로 영영 남아 있는 실행이 없다
- [ ] 케이스 목록을 글자·기능 영역·디바이스·활성 여부·마지막 결과 다섯 가지로 거를 수 있다
- [ ] 실행 결과 목록에서 상세로 들어가지 않고도 그 케이스가 **어떤 값으로** 돌았는지 사람이 읽을 라벨로 보인다
- [ ] 로그인하지 않으면 화면도 API도 열리지 않는다. 증적의 실행자 칸에 로그인한 사람 이름이 박힌다
- [ ] 인증 이전에 쌓인 실행은 실행자 칸이 `실행자 미상 (인증 도입 이전)`으로 나온다
- [ ] 실행 결과 목록에서 `증적 문서 만들기`를 눌러 PDF를 받을 수 있다. 도는 중에는 눌리지 않는다
- [ ] 러너 포트가 서버 바깥에서 닿지 않는다. 컨테이너끼리만 통한다
- [ ] 모든 화면 맨 위에 인스턴스 이름이 설정한 색의 띠로 뜨고, 브라우저 탭 제목에도 그 이름이 보인다
- [ ] 증적 문서 머리말에 인스턴스 이름과 테스트 저장소 주소가 적혀 있다
- [ ] 같은 서버에서 인스턴스 2개를 **§9.2의 여섯 가지만 바꿔** 동시에 띄울 수 있다
- [ ] 매일 정기 실행이 돌아 Grafana의 성공률 추이가 점이 아니라 선이 된다. 그 실행의 실행자 칸은 `스케줄러`다
