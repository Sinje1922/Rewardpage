# 🚀 리워드 플랫폼 배포 가이드 (Deployment Guide)

이 가이드는 로컬에서 개발한 리워드 플랫폼을 **Railway**(백엔드+DB)와 **Vercel**(프론트엔드)을 이용해 전 세계 어디서든 접속 가능하게 배포하는 방법을 설명합니다.

---

## 1. 백엔드 및 데이터베이스 배포 (Railway)

**Railway**는 서버와 데이터베이스를 가장 쉽게 연결하여 배포할 수 있는 서비스입니다.

1.  **Railway 가입**: [railway.app](https://railway.app)에 접속하여 GitHub 계정으로 가입합니다.
2.  **새 프로젝트 생성**: `New Project` -> `Provision PostgreSQL`을 선택하여 DB를 먼저 만듭니다.
3.  **서버 연결**: `New` -> `GitHub Repo`를 선택하여 현재 프로젝트 레포지토리를 연결합니다.
    *   Root Directory를 `server`로 설정합니다.
4.  **환경 변수(Variables) 설정**: Railway 대시보드의 서버 설정에서 다음 변수들을 추가합니다.
    *   `DATABASE_URL`: Railway에서 생성한 PostgreSQL의 `Connection URL`을 넣습니다. (자동 연결될 수도 있습니다)
    *   `JWT_SECRET`: 아무 긴 문자열이나 입력합니다. (예: `super-secret-reward-key-2026`)
    *   `CORS_ORIGIN`: 이후에 배포할 **Vercel 주소**를 넣습니다. (예: `https://reward-web.vercel.app`)
5.  **배포**: 빌드가 완료되면 `Domain` 탭에서 생성된 공개 URL을 복사해둡니다. (이것이 `백엔드 API 주소`가 됩니다)

---

## 2. 프론트엔드 배포 (Vercel)

**Vercel**은 Vue/Vite 앱을 배포하는 데 최적화되어 있습니다.

1.  **Vercel 가입**: [vercel.com](https://vercel.com)에 가입하고 GitHub 레포지토리를 연결합니다.
2.  **프로젝트 설정**:
    *   Framework Preset: `Vite` (자동 인식됨)
    *   Root Directory: `web`
3.  **환경 변수(Environment Variables) 설정**:
    *   `VITE_API_URL`: 위에서 복사한 **Railway 서버 URL**을 입력합니다. (끝에 `/api`는 붙이지 마세요)
    *   예: `https://server-production-xxxx.up.railway.app`
4.  **배포**: `Deploy` 버튼을 누르면 잠시 후 나만의 웹사이트 주소가 생성됩니다!

---

## 3. 데이터베이스 초기화 (중요)

최초 배포 후에는 클라우드 데이터베이스에 테이블이 생성되어 있지 않습니다. 로컬 터미널에서 다음 명령어를 실행하여 테이블을 생성해주세요.

```bash
# server 폴더로 이동 후
cd server

# DATABASE_URL을 Railway의 실제 주소로 잠시 바꾼 뒤 실행
# 혹은 Railway CLI를 설치하여 실행 가능
npx prisma db push
```

---

## 🚩 배포 체크리스트
- [ ] Vercel 주소가 Railway의 `CORS_ORIGIN`에 등록되었는가?
- [ ] Railway 주소가 Vercel의 `VITE_API_URL`에 등록되었는가?
- [ ] `prisma generate`가 빌드 스크립트에 포함되어 있는가? (이미 수정함)

이제 위 순서대로 진행하시면 외부에서도 접속 가능한 나만의 리워드 플랫폼이 완성됩니다! 🏁
