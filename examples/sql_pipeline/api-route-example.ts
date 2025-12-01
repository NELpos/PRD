// app/api/sql-pipeline/route.ts

/**
 * SQL Pipeline API with JWT & AI Support
 * Next.js 15 App Router API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { PipelineExecutor } from '@/lib/pipeline-executor'
import { registerAICommands } from '@/lib/ai-pipeline-commands'

// Pipeline Executor 인스턴스 생성 (싱글톤)
let executor: PipelineExecutor | null = null

function getExecutor(): PipelineExecutor {
  if (!executor) {
    executor = new PipelineExecutor()
    
    // AI 명령어 등록
    registerAICommands(executor, {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })
  }
  
  return executor
}

// ============================================
// POST /api/sql-pipeline - 파이프라인 실행
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, data } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const executor = getExecutor()
    const result = await executor.execute(query, data)

    return NextResponse.json({
      success: true,
      data: result,
      query,
      rowCount: result.length
    })

  } catch (error) {
    console.error('Pipeline execution error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/sql-pipeline/commands - 사용 가능한 명령어 목록
// ============================================

export async function GET() {
  const commands = [
    // JWT Commands
    {
      category: 'JWT',
      commands: [
        {
          name: 'jwtdecode',
          description: 'JWT 토큰 디코딩',
          syntax: 'jwtdecode <column>',
          example: 'SELECT * FROM users | jwtdecode access_token',
          parameters: ['column: 디코딩할 토큰 컬럼명']
        },
        {
          name: 'jwtextract',
          description: 'JWT에서 특정 필드 추출',
          syntax: 'jwtextract <column> fields=<field1,field2,...>',
          example: 'SELECT * FROM users | jwtextract token fields=userId,email,role',
          parameters: [
            'column: 토큰 컬럼명',
            'fields: 추출할 필드 목록'
          ]
        },
        {
          name: 'jwtvalidate',
          description: 'JWT 유효성 검증',
          syntax: 'jwtvalidate <column>',
          example: 'SELECT * FROM sessions | jwtvalidate access_token',
          parameters: ['column: 검증할 토큰 컬럼명']
        }
      ]
    },
    
    // AI Commands
    {
      category: 'AI',
      commands: [
        {
          name: 'ai_transform',
          description: 'AI 기반 자유 형식 데이터 변환',
          syntax: 'ai_transform <column> prompt="<prompt>" output_format=<format>',
          example: 'SELECT * FROM reviews | ai_transform review_text prompt="요약해줘" output_format=text',
          parameters: [
            'column: 변환할 컬럼명',
            'prompt: AI 명령어',
            'output_format: text|json|markdown (선택)',
            'batch_size: 배치 크기 (선택)'
          ]
        },
        {
          name: 'ai_extract',
          description: '구조화된 데이터 추출',
          syntax: 'ai_extract <column> fields=<field1,field2,...>',
          example: 'SELECT * FROM emails | ai_extract body fields=name,email,phone',
          parameters: [
            'column: 분석할 컬럼명',
            'fields: 추출할 필드 목록'
          ]
        },
        {
          name: 'ai_classify',
          description: '카테고리 분류',
          syntax: 'ai_classify <column> categories=<cat1,cat2,...>',
          example: 'SELECT * FROM tickets | ai_classify message categories="urgent,normal,low"',
          parameters: [
            'column: 분류할 컬럼명',
            'categories: 카테고리 목록',
            'include_confidence: 신뢰도 포함 여부 (선택)'
          ]
        },
        {
          name: 'ai_summarize',
          description: '텍스트 요약',
          syntax: 'ai_summarize <column> max_length=<length> style=<style>',
          example: 'SELECT * FROM articles | ai_summarize content max_length=100 style=brief',
          parameters: [
            'column: 요약할 컬럼명',
            'max_length: 최대 글자 수 (선택)',
            'style: brief|detailed|bullet_points (선택)'
          ]
        },
        {
          name: 'ai_translate',
          description: '다국어 번역',
          syntax: 'ai_translate <column> target_lang="<language>"',
          example: 'SELECT * FROM posts | ai_translate content target_lang="Korean"',
          parameters: [
            'column: 번역할 컬럼명',
            'target_lang: 목표 언어',
            'source_lang: 원본 언어 (선택)'
          ]
        },
        {
          name: 'ai_sentiment',
          description: '감정 분석',
          syntax: 'ai_sentiment <column> include_score=<true|false>',
          example: 'SELECT * FROM reviews | ai_sentiment review_text include_score=true',
          parameters: [
            'column: 분석할 컬럼명',
            'include_score: 감정 점수 포함 여부 (선택)',
            'include_aspects: 세부 측면 분석 포함 여부 (선택)'
          ]
        }
      ]
    },

    // Data Transformation Commands
    {
      category: 'Data Transformation',
      commands: [
        {
          name: 'filter',
          description: '조건 필터링',
          syntax: 'filter <condition>',
          example: 'SELECT * FROM users | filter age > 30 AND status = "active"'
        },
        {
          name: 'select',
          description: '특정 컬럼 선택',
          syntax: 'select <column1,column2,...>',
          example: 'SELECT * FROM users | select id,name,email'
        },
        {
          name: 'exclude',
          description: '특정 컬럼 제외',
          syntax: 'exclude <column1,column2,...>',
          example: 'SELECT * FROM users | exclude password,secret_key'
        },
        {
          name: 'sort',
          description: '정렬',
          syntax: 'sort <column> <asc|desc>',
          example: 'SELECT * FROM products | sort price desc'
        },
        {
          name: 'limit',
          description: '결과 개수 제한',
          syntax: 'limit <count>',
          example: 'SELECT * FROM logs | limit 100'
        }
      ]
    }
  ]

  return NextResponse.json({
    success: true,
    commands
  })
}
