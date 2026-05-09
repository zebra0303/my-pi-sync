연결된 Story의 최신 요구사항을 기준으로 Dev Task를 동기화합니다.
Background + Description 업데이트 후, Subtask 생성/수정 여부는 사용자에게 물어봅니다.

## Input

형식: `<TICKET_KEY> [REPO_PATH_1] [REPO_PATH_2] ...`

- TICKET_KEY: DevTask 키(예: LHVE-78) 또는 Story 키(예: LHVE-57)
- REPO_PATH: (선택) 코드 분석할 리포 경로

사용자 입력: `$ARGUMENTS`는 pi prompt template에서 전달된 인자 또는 사용자의 현재 요청에서 받은 인자로 해석합니다.

## Step 0: 티켓 유형 판별

1. `acli jira workitem view "<TICKET_KEY>" --fields '*all' --json` 로 티켓 정보 조회
2. 티켓 유형에 따라 분기:
   - **DevTask** → Phase 1로 진행
   - **Story** → 연결된 DevTask 확인
     - 있음 → 해당 DevTask(들)에 대해 Phase 1 (각각 순차 실행)
     - 없음 → Phase 0 (신규 DevTask 생성, 1:1 또는 1:N 분할)

## Phase 0: 신규 DevTask 생성 (Story에 DevTask가 없을 때)

### Step 0-1: Story 요구사항 수집

Story의 description, 코멘트, 첨부파일, Spike Report에서 전체 요구사항을 수집합니다.

### Step 0-2: 요구사항을 기술 레이어별로 분류

수집한 요구사항을 아래 기술 레이어로 분류합니다:

| 레이어 | 포함되는 작업 | 예시 |
|--------|-------------|------|
| **MVC / Server** | Razor 페이지, Controller, ViewModel, 서버 렌더링 | `.cshtml`, `Controller.cs`, `ViewModel.cs` |
| **React / SPA** | React 컴포넌트, hooks, 상태관리, 클라이언트 로직 | `.tsx`, `.jsx`, `store/`, `hooks/` |
| **Email / Notification** | 이메일 템플릿, 알림 서비스, 메시지 포맷 | `EmailTemplate.cshtml`, `NotificationService.cs` |
| **DB / Migration** | DB 스키마, 마이그레이션, seed 데이터 | `Migration_*.cs`, `DbContext.cs` |
| **Infrastructure** | 설정, 환경변수, Feature Flag, CI/CD | `appsettings.json`, `FeatureFlags.cs` |
| **Shared / Common** | 여러 레이어에서 공유하는 모델, 유틸, 상수 | `Constants.cs`, `SharedModels.cs` |

분류 결과를 테이블로 정리합니다:

```
=== 요구사항 레이어 분류 ===
| 요구사항 항목      | MVC | React | Email | DB | Infra | Shared |
|-------------------|-----|-------|-------|----|-------|--------|
| Item 1: 로고 교체  |  ✓  |   ✓   |   ✓   |    |       |   ✓    |
| Item 2: 색상 변경  |  ✓  |   ✓   |       |    |       |        |
| Item 3: 알림 수정  |     |       |   ✓   |    |       |        |
```

### Step 0-3: 분할 판단 — 단일(1:1) vs 분할(1:N)

**자동 분석 결과를 바탕으로** 분할 여부를 사용자에게 제안합니다.

#### 분할 판단 기준

| 조건 | 판단 | 이유 |
|------|------|------|
| 모든 항목이 1개 레이어에 집중 | **단일(1:1)** | 분할 불필요 |
| 2개 이상 레이어이나 파일 수 < 10개 | **단일(1:1) 권장** | 분할 시 오버헤드가 더 큼 |
| 2개 이상 레이어, 레이어당 작업량 ≥ 2일 | **분할(1:N) 제안** | 독립적으로 작업/리뷰 가능 |
| 레이어 간 담당자가 다를 가능성 | **분할(1:N) 제안** | 병렬 작업 가능 |
| 에셋 대기(디자인) 작업이 포함 | **분할(1:N) 제안** | 에셋 대기 작업을 별도 관리 |
| 같은 Epic 내 다른 Story와 파일 충돌 | **분할(1:N) 제안** | 충돌 영역을 별도 DevTask로 격리 |

#### 사용자에게 제안하는 형식

```
=== DevTask 생성 제안 ===

Story LHVE-53: "Rebrand Quiver — Main Application Pages"
요구사항 12개, 영향 파일 35개

[제안] 3개 DevTask로 분할 (1:N)

  DevTask A — MVC Pages (6개 항목, 15 files, ~3 days)
    Item 1, 2, 4, 6, 8, 10
    주요 파일: *.cshtml, *Controller.cs, *ViewModel.cs

  DevTask B — React Components (4개 항목, 12 files, ~2 days)
    Item 3, 5, 7, 9
    주요 파일: *.tsx, *.jsx, hooks/*, store/*

  DevTask C — Email Templates (2개 항목, 8 files, ~1.5 days)
    Item 11, 12
    주요 파일: EmailTemplate*.cshtml, NotificationService.cs

  ⚠ 충돌: DevTask A와 LHVE-79(DevTask)가 HelpModal.cshtml 공유
    → blocker 링크 설정 예정

선택: [이대로 생성] / [분할 조정] / [단일 DevTask] / [건너뛰기]
```

### Step 0-4: DevTask 생성

#### DevTask Summary 네이밍 규칙

분할 시 각 DevTask의 Summary는 Story 제목에 레이어를 접미사로 붙입니다:

```
[Story 요약] — [레이어]
```

예시:
- `Rebrand Quiver Main Pages — MVC Pages`
- `Rebrand Quiver Main Pages — React Components`
- `Rebrand Quiver Main Pages — Email Templates`

단일(1:1)인 경우에는 레이어 접미사 없이 Story 요약을 그대로 사용합니다.

#### DevTask Description 작성

각 DevTask의 Description에는 **해당 레이어에 속하는 요구사항만** 포함합니다.

분할된 DevTask의 Description 상단에 분할 맥락을 명시합니다:

```markdown
## Scope
This DevTask covers the **MVC / Server-rendered pages** layer of Story LHVE-53.
Related DevTasks: LHVE-XX (React Components), LHVE-YY (Email Templates)

## Requirements
(해당 레이어의 요구사항만 나열)
```

#### DevTask Background 작성

모든 분할된 DevTask는 **동일한 Background**를 공유합니다 (같은 Story에서 파생되므로).
단, Description의 Scope 섹션에서 자신의 레이어와 관련 DevTask를 명시합니다.

#### 링크 설정

1. **Story → DevTask**: 각 DevTask를 Story에 링크 (`is developed by`)
2. **DevTask 간 링크**: 같은 Story에서 분할된 DevTask끼리 `relates to` 링크
3. **Epic 내 충돌**: 다른 Story의 DevTask와 파일 충돌 시 `blocker` 또는 `relates to` 링크

```bash
# Story 링크
acli jira workitem link --from "<STORY_KEY>" --to "<DEVTASK_KEY>" --type "is developed by"

# 분할 DevTask 간 링크
acli jira workitem link --from "<DEVTASK_A>" --to "<DEVTASK_B>" --type "Relates"

# 충돌 링크
acli jira workitem link --from "<DEVTASK_A>" --to "<OTHER_DEVTASK>" --type "Relates"
```

### Step 0-5: Shared 항목 처리

여러 레이어에 걸치는 Shared 항목은 다음 규칙으로 배정합니다:

| 상황 | 배정 기준 |
|------|----------|
| Shared 모델/상수가 특정 레이어에서만 사용 | 해당 레이어 DevTask에 포함 |
| 여러 레이어에서 공통 사용 | 가장 먼저 착수할 DevTask에 포함 + 다른 DevTask에 blocker 링크 |
| 양이 많으면 (≥5 파일) | 별도 `Shared / Common` DevTask로 분리 |

## Phase 1: Dev Task Background + Description 동기화

### Step 1: Dev Task 현재 상태 수집

```bash
acli jira workitem view "<DEV_TASK_KEY>" --fields '*all' --json
```

- description, background (`customfield_16221`, ADF 형식), summary, status, 기존 subtask 목록 확인
- 요구사항 테이블은 `customfield_15280` 필드에 있음 (ADF 형식)
- 수락 기준은 `customfield_15288` 필드에 있음 (ADF 형식)

### Step 2: 연결된 Story에서 최신 요구사항 수집

Story = Source of Truth. **Story의 모든 항목은 DevTask에 반드시 포함해야 합니다.** 다음을 모두 수집합니다:
- Story description의 요구사항 테이블
- Story 코멘트의 추가/변경/제거 사항
- Story 첨부파일

**항목 필터링 규칙:**

| 표기 | 처리 | 설명 |
|------|------|------|
| 취소선 (Strikethrough) | **제외** | 삭제/취소된 요구사항. DevTask에 포함하지 않음. **유일한 제외 조건** |
| TBC (To Be Confirmed) | **포함** | 미확정 상태 표기를 DevTask에 그대로 유지 |
| TBD (To Be Determined) | **포함** | 미결정 상태 표기를 DevTask에 그대로 유지 |
| 일반 항목 | **포함** | Story에 있는 모든 일반 항목은 무조건 포함 |

> **IMPORTANT**: 취소선 처리된 항목만 제외합니다. Spike Report나 다른 소스에서 "제외"라고 판단한 항목이라도, Story에서 취소선이 아니면 DevTask에 포함해야 합니다. Story가 최우선 참조입니다.

### Step 3: Spike Report 참조 (있으면)

Story에 연결된 Spike Report가 있으면 **기술적 세부사항(파일, 라인, 의존성)**을 보강하는 용도로 참조합니다.
Spike Report는 Story 항목의 포함/제외를 결정하지 않습니다 — 항목의 포함/제외는 오직 Story 기준으로 판단합니다.

### Step 4: 코드 분석 (누락 항목이 있을 때)

REPO_PATH가 지정된 경우, 누락된 항목에 대해 코드를 분석하여 구체적인 파일/라인 정보를 보강합니다.

### Step 5: Diff 분석 — Story vs Dev Task

Story 요구사항과 Dev Task의 Background + Description을 비교하여:
- **누락 항목**: Story에는 있지만 Dev Task에 없는 항목
- **불일치 항목**: 내용이 달라진 항목
- **제거 항목**: Story에서 취소선 처리된 항목

### Step 6: Background + Description 변경 사항 미리보기 및 실행

**Background와 Description의 역할 구분:**

| 필드 | 용도 | 내용 | 저장 위치 |
|------|------|------|----------|
| **Background** | 작업의 맥락과 배경 정보 ("왜") | Story의 목적/배경, 비즈니스 컨텍스트, 관련 의사결정 히스토리, 기술적 제약사항 | 커스텀 필드 `customfield_16221` (REST API로 업데이트) |
| **Description** | 구체적인 작업 항목과 요구사항 ("무엇을") | 요구사항 목록, 파일/코드 변경 사항, 수용 기준, 테스트 항목 | 표준 `description` 필드 (acli로 업데이트) |

> **IMPORTANT**: Description 필드에 `## Background` 섹션을 포함하지 않습니다. Background 정보는 반드시 Background 커스텀 필드에만 작성합니다. Description에 Background가 중복으로 존재하면 제거합니다.

**Background 생성/수정 규칙:**
- Story의 description 상단 배경 설명, 코멘트의 맥락 정보, Spike Report의 기술적 분석 결과를 종합
- 개발자가 작업을 시작할 때 "왜 이 작업을 하는지" 빠르게 파악할 수 있도록 작성
- 기존 Background가 있으면 새로운 정보만 추가/수정 (기존 내용을 함부로 삭제하지 않음)
- Background가 비어있으면 Story 정보를 기반으로 새로 생성

**Description 표준 구조 (Background 포함하지 않음):**

```markdown
## Summary
(1-2문장 작업 요약)

## Scope — 요구사항 항목
(요구사항 테이블)

## Files to modify
(파일/라인/변경 내용)

## Acceptance criteria
(수용 기준)

## Testing
(테스트 항목)
```

**미리보기 출력 형식:**

```
=== Background 변경 사항 ===
[현재] ...
[변경후] ...

=== Description 변경 사항 ===
[추가] ...
[수정] ...
[제거] ...
```

사용자 확인 후 Background와 Description을 각각 업데이트합니다.

> **충돌 자동 감지**: Description의 영향 파일 목록이 변경되면, 업데이트 완료 후 Phase 3(Step 13)을 자동 실행하여 같은 Epic 내 다른 DevTask와의 파일 충돌을 검사합니다. 새로운 충돌이 발견되면 blocker/related 링크 설정을 제안합니다.

**IMPORTANT: ADF 형식으로 업로드**

Markdown을 `--description`으로 직접 전달하면 `##` 등이 Jira에 그대로 노출됩니다.
반드시 `~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py`로 변환 후 업로드합니다.

#### Description 업데이트 (acli)

```bash
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py --text "## Scope\n내용..." > /tmp/desc.json
acli jira workitem edit --key "<DEV_TASK_KEY>" --description-file /tmp/desc.json --yes
```

#### Background 업데이트 (REST API — 커스텀 필드)

`acli`는 커스텀 필드(`customfield_*`) 업데이트를 지원하지 않으므로, Jira REST API를 직접 호출합니다.

**Background 필드 ID**: `customfield_16221` (ADF 형식)

```bash
# 1. Markdown → ADF 변환
python3 ~/.pi/agent/skills/atlassian-workflows/scripts/md-to-adf.py --text "## Background\n내용..." > /tmp/bg.json

# 2. ADF를 Jira REST API payload로 감싸기
python3 -c "
import json
with open('/tmp/bg.json') as f:
    adf = json.load(f)
payload = json.dumps({'fields': {'customfield_16221': adf}})
print(payload)
" > /tmp/bg-payload.json

# 3. REST API로 업데이트
curl -s -X PUT \
  -u "\${CONFLUENCE_EMAIL:-larry@lunit.io}:\${CONFLUENCE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/bg-payload.json \
  "https://lunit.atlassian.net/rest/api/3/issue/<DEV_TASK_KEY>"
```

> **Note**: `CONFLUENCE_API_TOKEN` 환경변수는 Atlassian API 토큰으로, Jira REST API에도 동일하게 사용할 수 있습니다. 이메일은 `CONFLUENCE_EMAIL` 또는 직접 지정합니다.

#### 다른 커스텀 필드도 같은 방식으로

REST API는 모든 커스텀 필드를 지원합니다. `customfield_16221` 대신 다른 필드 ID를 사용하면 됩니다.

주요 커스텀 필드 참조:

| 필드 | ID | 용도 |
|------|-----|------|
| Background | `customfield_16221` | Dev Task 배경/맥락 |
| Requirements | `customfield_15280` | Story 요구사항 테이블 |
| Acceptance Criteria | `customfield_15288` | Story 수락 기준 |

## Phase 2: Subtask 관리 (선택)

### Step 7: 사용자에게 물어보기

"Subtask도 생성/업데이트하시겠습니까?"
- **예** → 누락 Subtask 생성 + 기존 포맷 정리
- **포맷 정리만** → 기존 Subtask의 description 포맷 표준화만
- **아니요** → Description 동기화만으로 종료

### Step 8: 기존 Subtask 분석

기존 Subtask의 포맷/커버리지를 검사합니다.

### Step 9: 누락 Subtask 그룹핑

**그룹핑 원칙:**

| 원칙 | 설명 |
|------|------|
| 같은 파일 | 동일 파일 수정 항목은 하나로 묶기 |
| 같은 도메인 | UI/DB/Infra 같은 도메인 작업은 함께 |
| 에셋 의존성 | 디자인팀 에셋 대기 항목은 별도 분리 |
| 테스트 분리 | 스냅샷/통합 테스트는 항상 마지막 Subtask |
| 적정 크기 | 하나의 Subtask는 0.5~2일 분량 |

### Step 10: 미리보기

생성/수정할 Subtask 목록을 사용자에게 보여줍니다.

### Step 11: 실행

사용자 확인 후 Subtask를 생성/수정합니다.

**Subtask 표준 포맷:**

Summary: `[Sub] <카테고리> — <작업 요약>`

Description (4개 필수 섹션):

```markdown
## Scope
수행할 작업 1-2문장

## Files to modify
- 파일경로 (Line N) - 변경 내용

## Estimate: N days
공수 근거 설명

## Testing
- 구체적인 테스트 항목
```

Subtask description도 반드시 `md-to-adf.py`로 ADF JSON 변환 후 업로드합니다.

### Step 12: 결과 요약

생성/수정된 항목을 요약하여 보여줍니다.

## Phase 3: 충돌 감지 및 작업 순서 관리

같은 Epic 내 다른 DevTask와 파일 충돌을 감지하고, blocker/related 링크로 작업 순서를 제어합니다.

> **Note**: Phase 1 실행 시에도 Description의 영향 파일이 변경되면 자동으로 Phase 3 충돌 감지를 트리거합니다.

### Step 13: 충돌 파일 감지

```bash
# 같은 Epic 내 다른 DevTask 목록 조회
acli jira workitem list --jql "project=LHVE AND issuetype=DevTask AND 'Epic Link'=LHVE-47" --fields summary,status --json
```

각 DevTask의 Description에서 영향 파일 목록을 추출하여 현재 DevTask와 비교합니다.

**충돌 보고서 형식:**

```
=== 파일 충돌 감지 ===

현재 DevTask: LHVE-78 (Rebrand Identity — MVC Pages)

충돌 DevTask 1: LHVE-79 (Rebrand Identity — Help Modal)
  공유 파일 (3):
    - Views/Shared/_Layout.cshtml (LHVE-78: 로고 교체, LHVE-79: Help 링크 수정)
    - Views/Shared/_Header.cshtml (LHVE-78: 브랜드 색상, LHVE-79: 메뉴 항목)
    - wwwroot/css/site.css (LHVE-78: 전역 스타일, LHVE-79: 모달 스타일)
  기존 링크: 없음

충돌 DevTask 2: LHVE-80 (Rebrand Quiver — React Components)
  공유 파일 (1):
    - src/shared/constants.ts (LHVE-78: 브랜드 상수, LHVE-80: 컴포넌트 상수)
  기존 링크: relates to (이미 설정됨)
```

### Step 14: 링크 유형 결정

충돌이 발견되면 아래 기준으로 **blocker** 또는 **relates to** 링크를 선택합니다:

| 조건 | 링크 유형 | 방향 | 이유 |
|------|----------|------|------|
| 같은 파일의 같은 영역(함수/섹션) 수정 | **blocker** | 먼저 할 쪽 → 나중 쪽 | 동시 수정 시 머지 충돌 확실 |
| 같은 파일이나 다른 영역 수정 | **relates to** | 양방향 | 주의만 필요, 병렬 가능 |
| 한쪽이 다른 쪽의 출력에 의존 (공유 모델/상수) | **blocker** | 생산자 → 소비자 | 소비자가 생산자 결과 필요 |
| 같은 파일이나 한쪽이 추가, 다른 쪽이 수정 | **relates to** | 양방향 | 충돌 가능성 낮음 |

#### 작업 순서 결정 규칙

blocker 링크의 방향(어느 쪽이 먼저인지)은 다음 우선순위로 결정합니다:

| 우선순위 | 기준 | 먼저 착수 |
|---------|------|----------|
| 1 | Shared/Common 변경을 포함하는 쪽 | Shared 변경 DevTask 먼저 |
| 2 | 변경 범위가 더 넓은(코어) 쪽 | 코어 변경 DevTask 먼저 |
| 3 | 다른 DevTask가 의존하는 파일을 생성/변경 | 생산자 DevTask 먼저 |
| 4 | 이미 진행 중(In Progress) | 진행 중인 DevTask 먼저 |
| 5 | Story 우선순위가 더 높은 쪽 | 상위 우선순위 먼저 |

### Step 15: 링크 설정 미리보기 및 실행

```
=== 링크 설정 제안 ===

[blocker] LHVE-78 → LHVE-79
  이유: _Layout.cshtml, _Header.cshtml 같은 영역 수정
  순서: LHVE-78 먼저 (브랜드 코어 변경) → LHVE-79 (Help 모달 후속 수정)

[relates to] LHVE-78 ↔ LHVE-80
  이유: constants.ts 공유하나 다른 영역 수정
  병렬 작업 가능, 머지 시 주의

선택: [이대로 설정] / [조정] / [건너뛰기]
```

사용자 확인 후 링크를 설정합니다:

```bash
# blocker 링크 (A를 먼저 완료해야 B 착수 가능)
acli jira workitem link --from "<DEVTASK_A>" --to "<DEVTASK_B>" --type "Blocks"

# relates to 링크 (병렬 가능, 주의 필요)
acli jira workitem link --from "<DEVTASK_A>" --to "<DEVTASK_B>" --type "Relates"
```

### Step 16: DevTask 재분할 (선택)

충돌이 심하거나 기존 단일 DevTask가 너무 클 때, Phase 0의 분할 기준(Step 0-2, 0-3)을 동일하게 적용하여 재분할을 제안합니다.

재분할 시 기존 DevTask의 Subtask가 있으면:
- 해당 레이어에 맞는 새 DevTask로 이동
- 이동 불가한 Subtask는 사용자에게 확인 후 처리

## 핵심 원칙

- **Story = 최우선 참조 (Source of Truth)**: Story의 모든 항목은 DevTask에 포함해야 함. 취소선 항목만 제외. Spike Report는 기술적 보강 용도일 뿐, 항목의 포함/제외를 결정하지 않음
- **Background = 왜, Description = 무엇을**: Background에는 배경/맥락/의사결정을, Description에는 구체적 작업 항목을 분리하여 작성
- **1:N 분할**: 하나의 Story에서 기술 레이어, 충돌 영역, 에셋 의존성, 배포 단위 기준으로 여러 DevTask로 분할 가능. 분할된 DevTask끼리는 `relates to` 링크로 연결
- **충돌 → 링크로 순서 제어**: 같은 파일을 수정하는 DevTask 간에는 blocker(같은 영역 수정) 또는 relates to(다른 영역 수정) 링크를 설정하여 작업 순서를 명시적으로 관리
- **요구사항 이동 금지**: Story 간 요구사항을 이동시키지 않음. 충돌은 DevTask 레벨에서 관리
- **ADF 필수**: Background, Description 모두 업데이트 시 반드시 md-to-adf.py로 변환 후 업로드
- **영문 작성**: Dev Task의 Background, Description, Subtask 등 Jira에 업로드되는 모든 콘텐츠는 영문으로 작성. 사용자와의 대화는 사용자의 언어에 맞추되, Jira 티켓 내용은 항상 영문.
