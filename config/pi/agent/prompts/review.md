---
description: Review current branch changes against origin/main or staged changes
argument-hint: "[base-branch|--cached]"
---

# 코드 리뷰

현재 브랜치의 변경 사항을 기준 브랜치와 비교해 코드 리뷰해줘.
기준 브랜치 인자가 없으면 `origin/main`을 사용하고, 인자가 있으면 `$1`을 기준으로 사용해줘.
단, `$1`이 `--cached` 또는 `--staged`이면 커밋 전 staged 변경만 리뷰해줘.

## 기준

- 기본 비교 기준은 `origin/main...HEAD`로 잡아줘.
- 먼저 `git fetch origin main`으로 리모트 기준을 최신화해줘.
  - 기준 브랜치가 `$1`로 주어진 경우에는 해당 브랜치에 맞게 fetch해줘.
  - `$1`이 `--cached` 또는 `--staged`이면 fetch를 생략해도 돼.
- 기본 리뷰 대상은 현재 브랜치에서 추가, 수정, 삭제된 코드와 설정이야.
- `$1`이 `--cached` 또는 `--staged`이면 `git diff --cached` 결과만 리뷰 대상으로 삼아줘.
- staged/unstaged 변경이 있으면 `HEAD` 비교에 포함되지 않을 수 있으니 별도로 확인하고 리뷰 범위에 포함할지 명시해줘.
- 단순 스타일, 취향, 사소한 리팩터링 제안보다 실제 결함 가능성이 있는 문제를 우선해줘.
- 리뷰 요청이므로 사용자가 별도로 요청하지 않는 한 코드를 직접 수정하지 말고, 문제와 권장 수정 방향을 제시해줘.

## 중점적으로 볼 것

- 버그, 런타임 오류, 예외 누락, null/undefined 처리 누락
- 보안 이슈, 권한 검증 누락, 민감정보 노출, 입력값 검증 문제
- 비즈니스 로직 오류, 조건 분기 오류, 경계값 처리 문제
- 비동기 처리, race condition, 캐시/상태 동기화 문제
- 기존 동작과의 호환성 깨짐, API 계약 변경, 데이터 마이그레이션 위험
- 테스트 누락 또는 기존 테스트가 놓칠 수 있는 위험한 경로
- 성능, 접근성, 사용자 경험에 실질적으로 영향을 줄 수 있는 문제

## Frontend / React / TypeScript 관점

- React hooks dependency, stale closure, cleanup 누락, 불필요한 re-render
- controlled/uncontrolled component 전환, form validation, focus management 문제
- 접근성: semantic element, role/name, keyboard interaction, aria 속성 오용
- TypeScript 타입 축소 실패, `any`/type assertion 남용, nullable 값 처리 누락
- API/loading/error/empty state 처리 누락
- UI 컴포넌트에 비즈니스 로직이 과도하게 섞였는지 확인

## 리뷰 방식

1. 변경 범위를 파악해줘.
   - `git status --short`
   - `$1`이 `--cached` 또는 `--staged`이면:
     - `git diff --cached --stat`
     - `git diff --cached`
   - 그 외에는:
     - `git diff --stat <base>...HEAD`
     - `git diff <base>...HEAD`
     - staged 변경이 있으면 `git diff --cached`
     - unstaged 변경이 있으면 `git diff`
   - 필요한 경우 관련 파일을 추가로 읽어 맥락을 확인해줘.

2. 발견한 문제를 심각도 순서로 정리해줘.
   - `Critical`: 보안 사고, 데이터 손상, 배포 즉시 장애 가능성
   - `High`: 주요 기능 오작동, 권한 우회, 중요한 회귀
   - `Medium`: 특정 조건에서 발생하는 버그, 유지보수상 위험한 로직
   - `Low`: 사소하지만 고치면 좋은 결함 또는 테스트 보강 포인트

3. 각 이슈는 아래 형식으로 작성해줘.
   - 우선순위: `P1`–`P5` 중 하나
   - 심각도: `Critical` / `High` / `Medium` / `Low`
   - 파일/함수/변경 위치
   - 문제 설명
   - 재현 또는 실패 시나리오
   - 권장 수정 방향

4. 우선순위는 아래 기준을 사용해줘.
   - `P1`: 반드시 반영해야 하는 결함
   - `P2`: 적극적으로 반영을 고려해야 하는 결함
   - `P3`: 가능하면 반영하면 좋은 개선/리스크
   - `P4`: 반영하지 않아도 되는 제안
   - `P5`: 사소한 코멘트

5. 확실하지 않은 내용은 단정하지 말고 "확인 필요"로 표시해줘.

6. 문제가 없으면 "발견된 주요 이슈 없음"이라고 말하고, 남아 있는 테스트 공백이나 수동 확인이 필요한 부분만 짧게 알려줘.

## 출력 형식

리뷰 결과는 아래 순서로 작성해줘.

1. 주요 발견 사항
2. 확인 필요 사항
3. 테스트/검증 제안

주요 발견 사항이 없으면 불필요하게 긴 요약은 생략해줘.
