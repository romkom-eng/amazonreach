# 블로그 자동화 문제 해결 가이드

## 🔍 문제 상황

- 블로그 포스트가 2월 10일 이후 생성되지 않음
- GitHub Actions 워크플로우가 매일 실행되어야 하지만 작동하지 않음

## ✅ 로컬 테스트 결과

블로그 생성 스크립트는 정상 작동합니다:
```bash
# 새 블로그 포스트 생성
node scripts/generate_daily_post.js

# 드래프트 발행
node scripts/blog_manager.js publish
```

## 🚨 GitHub Actions 문제 원인

GitHub Actions 워크플로우가 실행되지 않는 이유:

### 1. 워크플로우가 비활성화됨
- GitHub 리포지토리에서 워크플로우가 비활성화되었을 수 있음
- 60일 동안 활동이 없으면 자동으로 비활성화됨

### 2. 권한 문제
- GitHub Actions에 `contents: write` 권한이 필요
- 리포지토리 설정에서 Actions 권한 확인 필요

### 3. Cron 스케줄 문제
- GitHub Actions의 cron은 UTC 기준
- `0 0 * * *` = 매일 UTC 00:00 (한국시간 09:00)

## 🔧 해결 방법

### 방법 1: GitHub에서 워크플로우 수동 실행

1. GitHub 리포지토리 접속: `https://github.com/romkom-eng/amazonreach`
2. **Actions** 탭 클릭
3. 왼쪽 사이드바에서 **Daily Blog Automation** 선택
4. **Run workflow** 버튼 클릭
5. **Run workflow** 확인

### 방법 2: GitHub Actions 권한 확인

1. GitHub 리포지토리 → **Settings**
2. **Actions** → **General**
3. **Workflow permissions** 섹션에서:
   - ✅ **Read and write permissions** 선택
   - ✅ **Allow GitHub Actions to create and approve pull requests** 체크
4. **Save** 클릭

### 방법 3: 워크플로우 재활성화

1. GitHub 리포지토리 → **Actions** 탭
2. 비활성화된 워크플로우가 있다면 **Enable workflow** 클릭

### 방법 4: 로컬에서 수동 실행 후 푸시

```bash
# 1. 새 블로그 포스트 생성
cd /Users/kimjiyeon/.gemini/antigravity/scratch/amazonreach
node scripts/generate_daily_post.js

# 2. 드래프트 발행
node scripts/blog_manager.js publish

# 3. Git에 커밋 및 푸시
git add frontend/blog/ frontend/sitemap.xml
git commit -m "🤖 Manual Blog Post & Sitemap Update"
git push origin main
```

## 📅 자동화 스케줄 변경 (선택사항)

더 자주 실행하고 싶다면 `.github/workflows/daily-blog.yml` 수정:

```yaml
on:
  schedule:
    # 매일 2번 실행 (UTC 00:00, 12:00)
    - cron: '0 0,12 * * *'
  workflow_dispatch:
```

## ✅ 확인 사항

- [ ] GitHub Actions 탭에서 워크플로우 상태 확인
- [ ] 워크플로우 수동 실행 테스트
- [ ] Actions 권한 설정 확인
- [ ] 최근 워크플로우 실행 로그 확인
- [ ] 로컬에서 수동 실행 및 푸시

## 🎯 예상 결과

- GitHub Actions가 매일 UTC 00:00 (한국시간 09:00)에 자동 실행
- 새 블로그 포스트가 `frontend/blog/` 폴더에 생성
- `sitemap.xml`이 자동으로 업데이트
- 변경사항이 자동으로 커밋 및 푸시

## 💡 추가 팁

### 워크플로우 실행 로그 확인

1. GitHub → Actions → 워크플로우 선택
2. 최근 실행 클릭
3. 각 단계의 로그 확인
4. 에러 메시지 확인

### 즉시 블로그 포스트 생성

GitHub Actions를 기다리지 않고 즉시 생성하려면:
```bash
# 여러 개 생성
for i in {1..5}; do
  node scripts/generate_daily_post.js
  node scripts/blog_manager.js publish
  sleep 1
done
```

---

**참고**: GitHub Actions는 무료 플랜에서 월 2,000분까지 무료입니다. 이 워크플로우는 실행당 1분 미만 소요됩니다.
