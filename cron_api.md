# PRD: API Response Template Mapper System (Simplified Architecture)

## 1. 프로젝트 개요

### 1.1 목적
외부 API 응답을 사용자 정의 템플릿에 따라 자동으로 변환하여 PostgreSQL 데이터베이스에 저장하는 시스템 구축

### 1.2 핵심 가치
- **단순성**: 최소한의 컴포넌트로 강력한 기능 구현
- **자동화**: EKS Cron Job을 통한 완전 자동화된 데이터 수집
- **유연성**: 코드 변경 없이 템플릿 기반으로 새로운 API 추가

### 1.3 기술 스택
- **Frontend & Backend**: Next.js 14+ (App Router, Full-stack)
- **Database**: PostgreSQL 15+
- **Cron Job**: Python 3.11+ (EKS Cron Job)
- **Container**: Docker, Kubernetes (EKS)
- **Language**: TypeScript (Next.js), Python (Cron Job)

## 2. 시스템 아키텍처

### 2.1 심플한 아키텍처 구성
```
┌─────────────────────────┐
│   Next.js Full-stack    │
│  (Template Management)  │
│    - UI (React)         │
│    - API Routes         │
│    - DB Connection      │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │  PostgreSQL   │ ◀────────┐
    │   Database    │          │
    └───────────────┘          │
                               │
    ┌───────────────────────┐  │
    │  EKS Cron Job         │  │
    │  (Python Script)      │──┘
    │  - Read Templates     │
    │  - Call APIs          │
    │  - Transform Data     │
    │  - Save to DB         │
    └───────────────────────┘
```

### 2.2 데이터 흐름
1. **템플릿 관리**: 사용자가 Next.js UI에서 템플릿 생성/수정
2. **템플릿 저장**: Next.js API Routes가 PostgreSQL에 직접 저장
3. **정기 실행**: EKS Cron Job이 설정된 스케줄에 따라 Python 스크립트 실행
4. **데이터 처리**: Python 스크립트가 템플릿 읽기 → API 호출 → 변환 → DB 저장

## 3. 데이터베이스 스키마

### 3.1 핵심 테이블 설계

```sql
-- API 소스 정보
CREATE TABLE api_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    base_url TEXT NOT NULL,
    auth_type VARCHAR(50), -- 'bearer', 'api_key', 'basic', 'oauth2', 'none'
    auth_config JSONB, -- 암호화된 인증 정보
    default_headers JSONB,
    timeout_seconds INTEGER DEFAULT 30,
    retry_count INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 템플릿 정의
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    api_source_id UUID REFERENCES api_sources(id) ON DELETE CASCADE,
    endpoint_path TEXT NOT NULL,
    http_method VARCHAR(10) DEFAULT 'GET',
    query_params JSONB,
    request_body JSONB,
    target_table_name VARCHAR(255) NOT NULL,
    field_mappings JSONB NOT NULL,
    transform_rules JSONB,
    is_active BOOLEAN DEFAULT true,
    schedule_cron VARCHAR(100), -- '0 */6 * * *'
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

-- 실행 이력
CREATE TABLE job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'running', 'success', 'failed', 'partial'
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    api_response_time_ms INTEGER,
    total_duration_ms INTEGER,
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 실행 로그 (상세)
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES job_executions(id) ON DELETE CASCADE,
    log_level VARCHAR(20), -- 'info', 'warning', 'error'
    message TEXT,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_next_run ON templates(next_run_at) WHERE is_active = true;
CREATE INDEX idx_executions_template ON job_executions(template_id);
CREATE INDEX idx_executions_status ON job_executions(status);
CREATE INDEX idx_logs_execution ON execution_logs(execution_id);
```

### 3.2 Field Mappings 상세 구조
```json
{
  "version": "1.0",
  "mappings": [
    {
      "source_path": "$.data.temperature.value",
      "target_column": "temperature_celsius",
      "data_type": "decimal",
      "nullable": false,
      "transforms": [
        {
          "type": "multiply",
          "factor": 1.0
        }
      ],
      "default_value": 0.0,
      "validation": {
        "min": -100,
        "max": 100
      }
    },
    {
      "source_path": "$.data.recorded_at",
      "target_column": "measured_at",
      "data_type": "timestamp",
      "nullable": false,
      "transforms": [
        {
          "type": "date_format",
          "from_format": "unix_timestamp",
          "to_format": "ISO8601"
        }
      ]
    }
  ],
  "array_handling": {
    "type": "flatten", // 'flatten', 'first', 'last', 'aggregate'
    "root_path": "$.data.measurements"
  }
}
```

## 4. Next.js Full-stack 애플리케이션

### 4.1 프로젝트 구조
```
nextjs-app/
├── app/
│   ├── (dashboard)/
│   │   ├── templates/
│   │   │   ├── page.tsx          # 템플릿 목록
│   │   │   ├── new/page.tsx      # 템플릿 생성
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # 템플릿 상세
│   │   │       └── edit/page.tsx # 템플릿 수정
│   │   ├── sources/
│   │   │   ├── page.tsx          # API 소스 관리
│   │   │   └── new/page.tsx
│   │   ├── monitoring/
│   │   │   └── page.tsx          # 실행 모니터링
│   │   └── layout.tsx
│   ├── api/
│   │   ├── templates/
│   │   │   ├── route.ts          # GET, POST
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, PUT, DELETE
│   │   ├── sources/
│   │   │   └── route.ts
│   │   ├── test-api/
│   │   │   └── route.ts          # API 테스트
│   │   └── jobs/
│   │       └── [id]/
│   │           └── route.ts      # 작업 상태 조회
│   └── layout.tsx
├── components/
│   ├── templates/
│   │   ├── TemplateForm.tsx
│   │   ├── MappingEditor.tsx
│   │   ├── JsonTreeView.tsx
│   │   └── CronBuilder.tsx
│   └── ui/
├── lib/
│   ├── db.ts                     # PostgreSQL 연결
│   ├── api.ts                    # API 유틸리티
│   └── crypto.ts                 # 암호화 유틸리티
└── types/
    └── index.ts
```

### 4.2 주요 기능 구현

#### 4.2.1 템플릿 관리 페이지
```typescript
// app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const isActive = searchParams.get('active');

  const templates = await db.query(`
    SELECT t.*, s.name as source_name, 
           je.status as last_status,
           je.completed_at as last_run_at
    FROM templates t
    LEFT JOIN api_sources s ON t.api_source_id = s.id
    LEFT JOIN LATERAL (
      SELECT status, completed_at 
      FROM job_executions 
      WHERE template_id = t.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) je ON true
    WHERE ($1::boolean IS NULL OR t.is_active = $1)
    ORDER BY t.created_at DESC
    LIMIT $2 OFFSET $3
  `, [isActive, limit, (page - 1) * limit]);

  return NextResponse.json(templates);
}
```

#### 4.2.2 템플릿 생성 워크플로우
- **Step 1: API 소스 선택**
  - 기존 소스 선택 또는 새 소스 생성
  - 인증 정보 안전하게 저장 (AES-256 암호화)

- **Step 2: API 엔드포인트 설정**
  - 엔드포인트 URL 입력
  - HTTP 메서드, 헤더, 파라미터 설정
  - Test API 버튼으로 실제 응답 확인

- **Step 3: 필드 매핑**
  - JSON 응답 트리뷰 표시
  - 드래그 앤 드롭으로 소스 → 타겟 매핑
  - 데이터 타입 및 변환 규칙 설정
  - 실시간 매핑 결과 미리보기

- **Step 4: 스케줄 설정**
  - Cron 표현식 빌더 UI
  - 다음 실행 시간 미리보기
  - 활성화/비활성화 설정

#### 4.2.3 모니터링 대시보드
```typescript
// components/monitoring/ExecutionChart.tsx
export function ExecutionChart({ templateId }: { templateId?: string }) {
  // 최근 7일간 실행 통계
  // 성공/실패 비율
  // 평균 처리 시간
  // 처리된 레코드 수
}
```

### 4.3 API Routes 구현

#### 4.3.1 API 테스트 엔드포인트
```typescript
// app/api/test-api/route.ts
export async function POST(request: NextRequest) {
  const { sourceId, endpoint, method, headers, params } = await request.json();
  
  // API 소스 정보 조회
  const source = await getApiSource(sourceId);
  
  // 인증 정보 복호화 및 헤더 구성
  const authHeaders = await buildAuthHeaders(source);
  
  // API 호출
  const response = await fetch(`${source.base_url}${endpoint}`, {
    method,
    headers: { ...authHeaders, ...headers },
    // ... 기타 옵션
  });
  
  const data = await response.json();
  return NextResponse.json({ 
    status: response.status,
    headers: Object.fromEntries(response.headers),
    data 
  });
}
```

## 5. Python Cron Job 스크립트

### 5.1 프로젝트 구조
```
python-cron-job/
├── src/
│   ├── main.py                 # 진입점
│   ├── config.py              # 설정 관리
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connection.py      # DB 연결
│   │   └── models.py          # SQLAlchemy 모델
│   ├── api/
│   │   ├── __init__.py
│   │   ├── client.py          # API 호출 클라이언트
│   │   └── auth.py            # 인증 처리
│   ├── transform/
│   │   ├── __init__.py
│   │   ├── engine.py          # 변환 엔진
│   │   └── validators.py      # 데이터 검증
│   └── utils/
│       ├── __init__.py
│       ├── crypto.py          # 암호화/복호화
│       └── logger.py          # 로깅
├── tests/
├── requirements.txt
└── Dockerfile
```

### 5.2 핵심 구현

#### 5.2.1 메인 스크립트
```python
# src/main.py
import asyncio
from datetime import datetime
from croniter import croniter
from db.connection import get_db_session
from db.models import Template, JobExecution
from api.client import ApiClient
from transform.engine import TransformEngine
import logging

logger = logging.getLogger(__name__)

async def process_template(template: Template, session):
    """템플릿 처리 메인 로직"""
    execution = JobExecution(
        template_id=template.id,
        status='running',
        started_at=datetime.utcnow()
    )
    session.add(execution)
    session.commit()
    
    try:
        # 1. API 호출
        api_client = ApiClient(template.api_source)
        response_data = await api_client.call(
            endpoint=template.endpoint_path,
            method=template.http_method,
            params=template.query_params,
            body=template.request_body
        )
        
        # 2. 데이터 변환
        engine = TransformEngine(template)
        transformed_data = engine.transform(response_data)
        
        # 3. 데이터 저장
        records_saved = await save_to_target_table(
            session,
            template.target_table_name,
            transformed_data
        )
        
        # 4. 실행 결과 업데이트
        execution.status = 'success'
        execution.records_processed = records_saved
        execution.completed_at = datetime.utcnow()
        
    except Exception as e:
        logger.error(f"Template {template.id} processing failed: {str(e)}")
        execution.status = 'failed'
        execution.error_message = str(e)
        execution.completed_at = datetime.utcnow()
    
    finally:
        session.commit()

async def main():
    """Cron Job 메인 함수"""
    session = get_db_session()
    
    try:
        # 현재 시간에 실행해야 할 템플릿 조회
        now = datetime.utcnow()
        templates = session.query(Template).filter(
            Template.is_active == True,
            Template.next_run_at <= now
        ).all()
        
        logger.info(f"Found {len(templates)} templates to process")
        
        # 병렬 처리
        tasks = [process_template(t, session) for t in templates]
        await asyncio.gather(*tasks)
        
        # 다음 실행 시간 업데이트
        for template in templates:
            if template.schedule_cron:
                cron = croniter(template.schedule_cron, now)
                template.next_run_at = cron.get_next(datetime)
                template.last_run_at = now
        
        session.commit()
        
    finally:
        session.close()

if __name__ == "__main__":
    asyncio.run(main())
```

#### 5.2.2 변환 엔진
```python
# src/transform/engine.py
import jsonpath_ng
from typing import List, Dict, Any
import pandas as pd

class TransformEngine:
    def __init__(self, template):
        self.template = template
        self.mappings = template.field_mappings.get('mappings', [])
        
    def transform(self, api_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """API 응답을 타겟 스키마로 변환"""
        results = []
        
        # 배열 처리 확인
        array_config = self.template.field_mappings.get('array_handling')
        if array_config:
            data_list = self._handle_array(api_response, array_config)
        else:
            data_list = [api_response]
        
        # 각 데이터 항목 변환
        for data in data_list:
            transformed = {}
            for mapping in self.mappings:
                value = self._extract_value(data, mapping['source_path'])
                value = self._apply_transforms(value, mapping.get('transforms', []))
                value = self._validate_value(value, mapping)
                transformed[mapping['target_column']] = value
            results.append(transformed)
        
        return results
    
    def _extract_value(self, data: Dict, path: str) -> Any:
        """JSONPath로 값 추출"""
        jsonpath_expr = jsonpath_ng.parse(path)
        matches = jsonpath_expr.find(data)
        return matches[0].value if matches else None
```

### 5.3 EKS Cron Job 설정

#### 5.3.1 Kubernetes Manifest
```yaml
# k8s/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: api-template-processor
  namespace: data-pipeline
spec:
  schedule: "*/5 * * * *"  # 5분마다 실행
  concurrencyPolicy: Forbid  # 동시 실행 방지
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: processor
            image: your-registry/api-processor:latest
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection-string
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: encryption-key
            resources:
              requests:
                memory: "512Mi"
                cpu: "500m"
              limits:
                memory: "1Gi"
                cpu: "1000m"
          restartPolicy: OnFailure
```

#### 5.3.2 Dockerfile
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY src/ ./src/

# 실행
CMD ["python", "-m", "src.main"]
```

## 6. 보안 및 모범 사례

### 6.1 보안 구현
- **암호화**: API 인증 정보는 AES-256으로 암호화하여 저장
- **시크릿 관리**: Kubernetes Secrets 사용
- **네트워크**: VPC 내부 통신, Security Group 설정
- **접근 제어**: Next.js에 인증/인가 구현 (NextAuth.js)

### 6.2 에러 처리
- **재시도 로직**: Exponential backoff with jitter
- **부분 실패**: 개별 레코드 실패 시 계속 진행
- **알림**: 실패 시 Slack/Email 알림

### 6.3 모니터링
- **로깅**: CloudWatch Logs
- **메트릭**: CloudWatch Metrics (성공률, 처리 시간)
- **알람**: 실패율 임계치 초과 시 알람

## 7. 개발 단계

### Phase 1: MVP (1주)
- [ ] Next.js 기본 설정 및 DB 스키마 생성
- [ ] 템플릿 CRUD UI 구현
- [ ] API 테스트 기능
- [ ] 간단한 필드 매핑 (1:1 매핑)

### Phase 2: 핵심 기능 (1주)
- [ ] Python Cron Job 스크립트 개발
- [ ] JSONPath 기반 복잡한 매핑
- [ ] 변환 규칙 구현
- [ ] EKS 배포 및 테스트

### Phase 3: 고급 기능 (1주)
- [ ] 모니터링 대시보드
- [ ] 배열 데이터 처리
- [ ] 에러 처리 및 재시도
- [ ] 성능 최적화

### Phase 4: 완성도 (3일)
- [ ] 보안 강화
- [ ] 문서화
- [ ] 운영 가이드
- [ ] 성능 테스트

## 8. 성능 목표

- **API 응답 시간**: < 3초 (95 percentile)
- **변환 처리**: 1000 레코드/초
- **Cron Job 실행 시간**: < 5분 (일반적인 경우)
- **동시 템플릿 처리**: 최대 20개

## 9. 운영 고려사항

### 9.1 모니터링 지표
- 템플릿별 성공/실패율
- API 응답 시간
- 데이터 처리량
- 에러 발생 패턴

### 9.2 유지보수
- 정기적인 실행 로그 정리
- 오래된 데이터 아카이빙
- 템플릿 버전 관리
- API 변경 사항 추적

### 9.3 확장성
- 템플릿 수 증가에 따른 Cron Job 분산
- 대용량 데이터 처리를 위한 배치 최적화
- 읽기 전용 복제본 활용