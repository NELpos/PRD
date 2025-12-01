// lib/ai-pipeline-commands.ts

/**
 * AI-Powered Pipeline Commands
 * AWS Bedrock Claude Haiku 4.5를 활용한 데이터 변환 및 분석
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"

type DataRow = Record<string, any>
type OutputFormat = 'text' | 'json' | 'markdown' | 'csv' | 'auto'

// ============================================
// AWS Bedrock 클라이언트 설정
// ============================================

interface BedrockConfig {
  region: string
  accessKeyId?: string
  secretAccessKey?: string
}

class BedrockAIClient {
  private client: BedrockRuntimeClient
  private modelId = 'anthropic.claude-3-5-haiku-20241022-v1:0'

  constructor(config: BedrockConfig) {
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: config.accessKeyId ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey!
      } : undefined
    })
  }

  async invoke(prompt: string, systemPrompt?: string): Promise<string> {
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      ...(systemPrompt && { system: systemPrompt })
    }

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    })

    try {
      const response = await this.client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      return responseBody.content[0].text
    } catch (error) {
      console.error('Bedrock invocation error:', error)
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 배치 처리를 위한 병렬 호출 (rate limit 고려)
   */
  async invokeBatch(
    prompts: string[], 
    concurrency: number = 5,
    systemPrompt?: string
  ): Promise<string[]> {
    const results: string[] = []
    
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(prompt => this.invoke(prompt, systemPrompt))
      )
      results.push(...batchResults)
      
      // Rate limiting을 위한 딜레이
      if (i + concurrency < prompts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }
}

// ============================================
// AI 파이프라인 커맨드
// ============================================

export const aiCommands = {
  /**
   * ai_transform - AI를 사용한 데이터 변환
   * 
   * 사용법:
   * | ai_transform column prompt="요약해줘" output_format=text
   * | ai_transform review prompt="긍정/부정 판단" output_format=json
   */
  ai_transform: async (
    data: DataRow[], 
    args: {
      column: string
      prompt: string
      output_format?: OutputFormat
      system_prompt?: string
      batch_size?: number
    },
    aiClient: BedrockAIClient
  ) => {
    const { 
      column, 
      prompt, 
      output_format = 'text',
      system_prompt,
      batch_size = 5 
    } = args

    // 출력 포맷에 맞는 시스템 프롬프트 생성
    const formatPrompt = getFormatPrompt(output_format)
    const fullSystemPrompt = system_prompt 
      ? `${system_prompt}\n\n${formatPrompt}`
      : formatPrompt

    // 각 행의 컬럼 값으로 프롬프트 생성
    const prompts = data.map(row => {
      const value = row[column]
      return `${prompt}\n\nInput:\n${value}`
    })

    try {
      // 배치로 AI 호출
      const aiResults = await aiClient.invokeBatch(
        prompts, 
        batch_size,
        fullSystemPrompt
      )

      // 결과를 행에 추가
      return data.map((row, index) => ({
        ...row,
        [`${column}_ai_result`]: parseOutput(aiResults[index], output_format),
        [`${column}_ai_prompt`]: prompt,
        [`${column}_ai_format`]: output_format
      }))
    } catch (error) {
      // 에러 발생 시 에러 정보 추가
      return data.map(row => ({
        ...row,
        [`${column}_ai_result`]: null,
        [`${column}_ai_error`]: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  /**
   * ai_extract - 구조화된 데이터 추출
   * 
   * 사용법:
   * | ai_extract text fields="name,email,phone" output_format=json
   */
  ai_extract: async (
    data: DataRow[],
    args: {
      column: string
      fields: string[]
      output_format?: 'json' | 'auto'
      batch_size?: number
    },
    aiClient: BedrockAIClient
  ) => {
    const { column, fields, output_format = 'json', batch_size = 5 } = args

    const extractPrompt = `Extract the following fields from the text: ${fields.join(', ')}
    
Return the result as a JSON object with these exact field names.
If a field is not found, use null as the value.`

    const systemPrompt = `You are a data extraction assistant. 
Extract information accurately and return it in valid JSON format.
Only return the JSON object, no additional text.`

    const prompts = data.map(row => {
      const value = row[column]
      return `${extractPrompt}\n\nText to analyze:\n${value}`
    })

    try {
      const aiResults = await aiClient.invokeBatch(prompts, batch_size, systemPrompt)

      return data.map((row, index) => {
        try {
          const extracted = JSON.parse(aiResults[index])
          return {
            ...row,
            [`${column}_extracted`]: extracted,
            ...Object.fromEntries(
              fields.map(field => [`${field}_extracted`, extracted[field]])
            )
          }
        } catch {
          return {
            ...row,
            [`${column}_extracted`]: null,
            [`${column}_extract_error`]: 'Failed to parse JSON response'
          }
        }
      })
    } catch (error) {
      return data.map(row => ({
        ...row,
        [`${column}_extracted`]: null,
        [`${column}_extract_error`]: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  /**
   * ai_classify - 카테고리 분류
   * 
   * 사용법:
   * | ai_classify review categories="positive,negative,neutral"
   */
  ai_classify: async (
    data: DataRow[],
    args: {
      column: string
      categories: string[]
      include_confidence?: boolean
      batch_size?: number
    },
    aiClient: BedrockAIClient
  ) => {
    const { column, categories, include_confidence = false, batch_size = 5 } = args

    const classifyPrompt = include_confidence
      ? `Classify the following text into one of these categories: ${categories.join(', ')}

Return a JSON object with:
- category: the chosen category
- confidence: a number between 0 and 1 indicating confidence level
- reasoning: brief explanation of why this category was chosen

Only return the JSON object, no additional text.`
      : `Classify the following text into one of these categories: ${categories.join(', ')}

Return only the category name, nothing else.`

    const systemPrompt = `You are a text classification assistant.
Choose the most appropriate category based on the content.
Be consistent and accurate in your classifications.`

    const prompts = data.map(row => {
      const value = row[column]
      return `${classifyPrompt}\n\nText to classify:\n${value}`
    })

    try {
      const aiResults = await aiClient.invokeBatch(prompts, batch_size, systemPrompt)

      return data.map((row, index) => {
        const result = aiResults[index]
        
        if (include_confidence) {
          try {
            const parsed = JSON.parse(result)
            return {
              ...row,
              [`${column}_category`]: parsed.category,
              [`${column}_confidence`]: parsed.confidence,
              [`${column}_reasoning`]: parsed.reasoning
            }
          } catch {
            return {
              ...row,
              [`${column}_category`]: result.trim(),
              [`${column}_confidence`]: null,
              [`${column}_reasoning`]: null
            }
          }
        } else {
          return {
            ...row,
            [`${column}_category`]: result.trim()
          }
        }
      })
    } catch (error) {
      return data.map(row => ({
        ...row,
        [`${column}_category`]: null,
        [`${column}_classify_error`]: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  /**
   * ai_summarize - 텍스트 요약
   * 
   * 사용법:
   * | ai_summarize content max_length=100
   */
  ai_summarize: async (
    data: DataRow[],
    args: {
      column: string
      max_length?: number
      style?: 'brief' | 'detailed' | 'bullet_points'
      batch_size?: number
    },
    aiClient: BedrockAIClient
  ) => {
    const { 
      column, 
      max_length = 200, 
      style = 'brief',
      batch_size = 5 
    } = args

    const styleInstructions = {
      brief: 'Provide a concise one-sentence summary.',
      detailed: 'Provide a comprehensive summary covering all key points.',
      bullet_points: 'Provide a summary as bullet points (3-5 points).'
    }

    const summarizePrompt = `Summarize the following text in ${max_length} characters or less.
${styleInstructions[style]}

Keep the summary clear, accurate, and informative.`

    const systemPrompt = `You are a summarization assistant.
Create accurate, concise summaries that capture the essential information.`

    const prompts = data.map(row => {
      const value = row[column]
      return `${summarizePrompt}\n\nText to summarize:\n${value}`
    })

    try {
      const aiResults = await aiClient.invokeBatch(prompts, batch_size, systemPrompt)

      return data.map((row, index) => ({
        ...row,
        [`${column}_summary`]: aiResults[index].trim(),
        [`${column}_summary_style`]: style,
        [`${column}_original_length`]: String(row[column]).length,
        [`${column}_summary_length`]: aiResults[index].trim().length
      }))
    } catch (error) {
      return data.map(row => ({
        ...row,
        [`${column}_summary`]: null,
        [`${column}_summary_error`]: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  /**
   * ai_translate - 다국어 번역
   * 
   * 사용법:
   * | ai_translate content target_lang="Korean"
   */
  ai_translate: async (
    data: DataRow[],
    args: {
      column: string
      target_lang: string
      source_lang?: string
      batch_size?: number
    },
    aiClient: BedrockAIClient
  ) => {
    const { column, target_lang, source_lang = 'auto-detect', batch_size = 5 } = args

    const translatePrompt = source_lang === 'auto-detect'
      ? `Translate the following text to ${target_lang}.
Return only the translated text, nothing else.`
      : `Translate the following text from ${source_lang} to ${target_lang}.
Return only the translated text, nothing else.`

    const systemPrompt = `You are a professional translator.
Provide accurate, natural-sounding translations.
Preserve the tone and intent of the original text.`

    const prompts = data.map(row => {
      const value = row[column]
      return `${translatePrompt}\n\nText to translate:\n${value}`
    })

    try {
      const aiResults = await aiClient.invokeBatch(prompts, batch_size, systemPrompt)

      return data.map((row, index) => ({
        ...row,
        [`${column}_translated`]: aiResults[index].trim(),
        [`${column}_target_lang`]: target_lang,
        [`${column}_source_lang`]: source_lang
      }))
    } catch (error) {
      return data.map(row => ({
        ...row,
        [`${column}_translated`]: null,
        [`${column}_translate_error`]: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  /**
   * ai_sentiment - 감정 분석
   * 
   * 사용법:
   * | ai_sentiment review include_score=true
   */
  ai_sentiment: async (
    data: DataRow[],
    args: {
      column: string
      include_score?: boolean
      include_aspects?: boolean
      batch_size?: number
    },
    aiClient: BedrockAIClient
  ) => {
    const { 
      column, 
      include_score = true, 
      include_aspects = false,
      batch_size = 5 
    } = args

    const sentimentPrompt = `Analyze the sentiment of the following text.

Return a JSON object with:
- sentiment: "positive", "negative", or "neutral"
${include_score ? '- score: a number between -1 (very negative) and 1 (very positive)' : ''}
${include_aspects ? '- aspects: an object with sentiment for different aspects (if applicable)' : ''}
- keywords: array of key emotional words/phrases

Only return the JSON object, no additional text.`

    const systemPrompt = `You are a sentiment analysis expert.
Analyze the emotional tone and sentiment accurately.
Consider context, sarcasm, and nuanced language.`

    const prompts = data.map(row => {
      const value = row[column]
      return `${sentimentPrompt}\n\nText to analyze:\n${value}`
    })

    try {
      const aiResults = await aiClient.invokeBatch(prompts, batch_size, systemPrompt)

      return data.map((row, index) => {
        try {
          const analysis = JSON.parse(aiResults[index])
          return {
            ...row,
            [`${column}_sentiment`]: analysis.sentiment,
            ...(include_score && { [`${column}_sentiment_score`]: analysis.score }),
            ...(include_aspects && { [`${column}_sentiment_aspects`]: analysis.aspects }),
            [`${column}_sentiment_keywords`]: analysis.keywords
          }
        } catch {
          return {
            ...row,
            [`${column}_sentiment`]: null,
            [`${column}_sentiment_error`]: 'Failed to parse sentiment response'
          }
        }
      })
    } catch (error) {
      return data.map(row => ({
        ...row,
        [`${column}_sentiment`]: null,
        [`${column}_sentiment_error`]: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }
}

// ============================================
// 헬퍼 함수
// ============================================

function getFormatPrompt(format: OutputFormat): string {
  switch (format) {
    case 'json':
      return 'Return your response as valid JSON only. No additional text or markdown formatting.'
    case 'markdown':
      return 'Format your response using Markdown syntax for better readability.'
    case 'csv':
      return 'Return your response in CSV format with appropriate headers.'
    case 'text':
      return 'Return your response as plain text without any special formatting.'
    case 'auto':
    default:
      return 'Choose the most appropriate format for your response.'
  }
}

function parseOutput(output: string, format: OutputFormat): any {
  const trimmed = output.trim()
  
  switch (format) {
    case 'json':
      try {
        // JSON 마크다운 블록 제거
        const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/) || 
                         trimmed.match(/```\s*([\s\S]*?)\s*```/)
        const jsonStr = jsonMatch ? jsonMatch[1] : trimmed
        return JSON.parse(jsonStr)
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 반환
        return trimmed
      }
    
    case 'csv':
      // CSV를 배열로 변환
      return trimmed.split('\n').map(line => line.split(','))
    
    case 'markdown':
    case 'text':
    case 'auto':
    default:
      return trimmed
  }
}

// ============================================
// Pipeline Executor에 통합
// ============================================

export function registerAICommands(
  executor: any, 
  bedrockConfig: BedrockConfig
) {
  const aiClient = new BedrockAIClient(bedrockConfig)

  // AI 명령어 등록
  executor.registerCommand('ai_transform', (data: DataRow[], args: any) => 
    aiCommands.ai_transform(data, args, aiClient)
  )

  executor.registerCommand('ai_extract', (data: DataRow[], args: any) => 
    aiCommands.ai_extract(data, args, aiClient)
  )

  executor.registerCommand('ai_classify', (data: DataRow[], args: any) => 
    aiCommands.ai_classify(data, args, aiClient)
  )

  executor.registerCommand('ai_summarize', (data: DataRow[], args: any) => 
    aiCommands.ai_summarize(data, args, aiClient)
  )

  executor.registerCommand('ai_translate', (data: DataRow[], args: any) => 
    aiCommands.ai_translate(data, args, aiClient)
  )

  executor.registerCommand('ai_sentiment', (data: DataRow[], args: any) => 
    aiCommands.ai_sentiment(data, args, aiClient)
  )
}

// ============================================
// 타입 정의
// ============================================

export interface AICommandArgs {
  column: string
  prompt?: string
  output_format?: OutputFormat
  system_prompt?: string
  batch_size?: number
  [key: string]: any
}

export { BedrockAIClient, BedrockConfig, OutputFormat }
