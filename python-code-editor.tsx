import React, { useState, useRef, useEffect } from 'react';
import { FileCode, MessageSquare, GitCompare, Play, Save, X, Send, Sparkles, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

const PythonCodeEditor = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [code, setCode] = useState(`def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])
    
    return sequence

# Test the function
result = fibonacci(10)
print(f"Fibonacci sequence: {result}")`);

  const [originalCode] = useState(`def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    
    return fib

result = fibonacci(10)
print(result)`);

  const [comments, setComments] = useState([
    { line: 2, author: 'Sarah Kim', text: '문서화 문자열 추가 좋습니다!', timestamp: '2분 전', type: 'human' },
    { line: 13, author: 'John Park', text: '변수명을 더 명확하게 하면 좋겠어요', timestamp: '5분 전', type: 'human' }
  ]);

  const [aiReviews, setAiReviews] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiReviews, setShowAiReviews] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [selectedLine, setSelectedLine] = useState(null);
  const [output, setOutput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const textareaRef = useRef(null);

  // AI 코드 리뷰 시뮬레이션
  const handleAIReview = () => {
    setIsAnalyzing(true);
    setAiReviews([]);
    
    setTimeout(() => {
      const reviews = [
        {
          line: 1,
          severity: 'info',
          category: '문서화',
          issue: '함수 파라미터 타입 힌트 추가 권장',
          suggestion: 'def fibonacci(n: int) -> list[int]:',
          explanation: '타입 힌트를 추가하면 코드 가독성과 IDE 지원이 향상됩니다.',
          code: 'def fibonacci(n: int) -> list[int]:'
        },
        {
          line: 3,
          severity: 'warning',
          category: '에러 처리',
          issue: '음수 입력에 대한 명시적 에러 처리 부족',
          suggestion: 'ValueError 예외 발생 고려',
          explanation: 'n이 음수일 때 빈 리스트를 반환하는 것보다 명시적으로 에러를 발생시키는 것이 더 명확합니다.',
          code: `if n < 0:
    raise ValueError("n must be non-negative")`
        },
        {
          line: 9,
          severity: 'suggestion',
          category: '성능',
          issue: 'append 대신 리스트 컴프리헨션 고려',
          suggestion: '더 pythonic한 방식으로 개선 가능',
          explanation: '작은 데이터셋에서는 큰 차이가 없지만, 리스트 컴프리헨션이 일반적으로 더 빠릅니다.',
          code: '# 또는 제너레이터 사용 고려'
        },
        {
          line: 15,
          severity: 'error',
          category: '보안',
          issue: 'print 함수에서 f-string 사용 시 주의',
          suggestion: '사용자 입력을 직접 출력할 때는 검증 필요',
          explanation: '현재 코드는 안전하지만, 외부 입력을 받을 경우 주입 공격에 취약할 수 있습니다.',
          code: '# 입력 검증 로직 추가 권장'
        },
        {
          line: 7,
          severity: 'info',
          category: '코드 스타일',
          issue: '변수명 개선 제안',
          suggestion: 'sequence는 적절한 이름이지만 fib_sequence가 더 명확',
          explanation: '더 구체적인 변수명은 코드의 의도를 명확하게 전달합니다.',
          code: 'fib_sequence = [0, 1]'
        }
      ];
      
      setAiReviews(reviews);
      setIsAnalyzing(false);
      setActiveTab('review');
    }, 2000);
  };

  const handleRun = () => {
    setOutput('Fibonacci sequence: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n\n코드 실행 완료 ✓');
  };

  const handleAddComment = () => {
    if (newComment.trim() && selectedLine !== null) {
      setComments([...comments, {
        line: selectedLine,
        author: '나',
        text: newComment,
        timestamp: '방금 전',
        type: 'human'
      }]);
      setNewComment('');
      setSelectedLine(null);
    }
  };

  // 커서 위치 업데이트
  const updateCursorPosition = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const text = textarea.value.substring(0, textarea.selectionStart);
      const lines = text.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      setCursorPosition({ line, col });
    }
  };

  // Tab 키 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'suggestion': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'error': return 'border-red-400 bg-red-50';
      case 'warning': return 'border-yellow-400 bg-yellow-50';
      case 'suggestion': return 'border-blue-400 bg-blue-50';
      default: return 'border-green-400 bg-green-50';
    }
  };

  const getSeverityBgColor = (severity) => {
    switch(severity) {
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-yellow-50';
      case 'suggestion': return 'bg-blue-50';
      default: return 'bg-green-50';
    }
  };

  // 고급 Python 문법 하이라이팅
  const highlightPythonCode = (line) => {
    if (!line.trim()) return <span> </span>;

    // 주석 처리
    if (line.trim().startsWith('#')) {
      return <span className="text-gray-500 italic">{line}</span>;
    }

    const tokens = [];
    let currentIndex = 0;

    // Python 키워드 정의
    const keywords = /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|yield|async|await|pass|break|continue|raise|assert|del|global|nonlocal|in|is|not|and|or|True|False|None)\b/g;
    const builtins = /\b(print|len|range|enumerate|zip|map|filter|sum|max|min|abs|all|any|sorted|reversed|list|dict|set|tuple|str|int|float|bool|type|isinstance|hasattr|getattr|setattr|open|input|super|property|staticmethod|classmethod)\b/g;
    const strings = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|f"(?:[^"\\]|\\.)*"|f'(?:[^'\\]|\\.)*')/g;
    const numbers = /\b(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\b/g;
    const decorators = /(@\w+)/g;
    const functions = /(def\s+)(\w+)/g;
    const classes = /(class\s+)(\w+)/g;
    const exceptions = /\b(\w*Error|\w*Exception|Warning)\b/g;
    const selfCls = /\b(self|cls)\b/g;
    const operators = /(\+|-|\*|\/|\/\/|%|\*\*|==|!=|<=|>=|<|>|=|\+=|-=|\*=|\/=|&|\||~|\^|<<|>>)/g;

    // 문자열 먼저 매칭 (가장 높은 우선순위)
    const stringMatches = [];
    let match;
    while ((match = strings.exec(line)) !== null) {
      stringMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'string' });
    }

    // 문자열 영역을 제외한 부분들을 토큰화
    const segments = [];
    let lastEnd = 0;
    
    stringMatches.forEach(str => {
      if (str.start > lastEnd) {
        segments.push({ start: lastEnd, end: str.start, text: line.substring(lastEnd, str.start), type: 'code' });
      }
      segments.push(str);
      lastEnd = str.end;
    });
    
    if (lastEnd < line.length) {
      segments.push({ start: lastEnd, end: line.length, text: line.substring(lastEnd), type: 'code' });
    }

    return (
      <span>
        {segments.map((segment, idx) => {
          if (segment.type === 'string') {
            const isDocstring = segment.text.startsWith('"""') || segment.text.startsWith("'''");
            const isFString = segment.text.startsWith('f"') || segment.text.startsWith("f'");
            return (
              <span key={idx} className={isDocstring ? 'text-green-600 italic' : isFString ? 'text-amber-600' : 'text-green-700'}>
                {segment.text}
              </span>
            );
          }

          // 코드 부분 파싱
          const text = segment.text;
          const parts = [];
          let lastIdx = 0;

          // 모든 토큰 수집
          const allTokens = [];
          
          // 키워드
          keywords.lastIndex = 0;
          while ((match = keywords.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'keyword' });
          }
          
          // 빌트인 함수
          builtins.lastIndex = 0;
          while ((match = builtins.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'builtin' });
          }
          
          // 숫자
          numbers.lastIndex = 0;
          while ((match = numbers.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'number' });
          }
          
          // 데코레이터
          decorators.lastIndex = 0;
          while ((match = decorators.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'decorator' });
          }
          
          // 예외
          exceptions.lastIndex = 0;
          while ((match = exceptions.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'exception' });
          }
          
          // self, cls
          selfCls.lastIndex = 0;
          while ((match = selfCls.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[0].length, text: match[0], type: 'self' });
          }

          // 함수 정의
          functions.lastIndex = 0;
          while ((match = functions.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[1].length, text: match[1], type: 'keyword' });
            allTokens.push({ start: match.index + match[1].length, end: match.index + match[0].length, text: match[2], type: 'function' });
          }

          // 클래스 정의
          classes.lastIndex = 0;
          while ((match = classes.exec(text)) !== null) {
            allTokens.push({ start: match.index, end: match.index + match[1].length, text: match[1], type: 'keyword' });
            allTokens.push({ start: match.index + match[1].length, end: match.index + match[0].length, text: match[2], type: 'class' });
          }

          // 정렬 및 중복 제거
          allTokens.sort((a, b) => a.start - b.start);
          const filtered = [];
          for (let i = 0; i < allTokens.length; i++) {
            if (i === 0 || allTokens[i].start >= filtered[filtered.length - 1].end) {
              filtered.push(allTokens[i]);
            }
          }

          // 렌더링
          filtered.forEach((token, tokenIdx) => {
            if (token.start > lastIdx) {
              parts.push(<span key={`text-${idx}-${tokenIdx}`}>{text.substring(lastIdx, token.start)}</span>);
            }

            const className = 
              token.type === 'keyword' ? 'text-purple-600 font-semibold' :
              token.type === 'builtin' ? 'text-blue-600 font-medium' :
              token.type === 'number' ? 'text-orange-600' :
              token.type === 'decorator' ? 'text-yellow-600 font-medium' :
              token.type === 'exception' ? 'text-red-600 font-medium' :
              token.type === 'self' ? 'text-purple-500 italic' :
              token.type === 'function' ? 'text-blue-700 font-semibold' :
              token.type === 'class' ? 'text-teal-600 font-bold' :
              '';

            parts.push(
              <span key={`token-${idx}-${tokenIdx}`} className={className}>
                {token.text}
              </span>
            );
            lastIdx = token.end;
          });

          if (lastIdx < text.length) {
            parts.push(<span key={`end-${idx}`}>{text.substring(lastIdx)}</span>);
          }

          return <span key={idx}>{parts}</span>;
        })}
      </span>
    );
  };

  const renderLineNumbers = (text) => {
    const lines = text.split('\n');
    return lines.map((_, index) => {
      const lineNum = index + 1;
      const aiIssue = aiReviews.find(r => r.line === lineNum);
      
      return (
        <div
          key={index}
          className={`relative text-right pr-4 select-none hover:bg-blue-50 cursor-pointer transition-colors ${
            aiIssue && showAiReviews ? 'font-bold' : ''
          }`}
          onClick={() => setSelectedLine(lineNum)}
          style={{ 
            backgroundColor: selectedLine === lineNum ? '#dbeafe' : 'transparent',
            minHeight: '24px',
            lineHeight: '24px',
            color: aiIssue && showAiReviews 
              ? aiIssue.severity === 'error' ? '#ef4444'
              : aiIssue.severity === 'warning' ? '#f59e0b'
              : aiIssue.severity === 'suggestion' ? '#3b82f6'
              : '#10b981'
              : '#6b7280'
          }}
        >
          <div className="flex items-center justify-end gap-1">
            {aiIssue && showAiReviews && (
              <span className="text-xs">●</span>
            )}
            <span>{lineNum}</span>
          </div>
        </div>
      );
    });
  };

  const renderHighlightedCode = (text) => {
    const lines = text.split('\n');
    return (
      <div className="font-mono text-sm" style={{ lineHeight: '24px' }}>
        {lines.map((line, index) => (
          <div key={index} style={{ minHeight: '24px' }}>
            {highlightPythonCode(line)}
          </div>
        ))}
      </div>
    );
  };

  const renderDiff = () => {
    const oldLines = originalCode.split('\n');
    const newLines = code.split('\n');

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="bg-red-50 px-4 py-2 font-semibold text-sm border-b border-red-200">
            Original
          </div>
          <div className="font-mono text-sm">
            {oldLines.map((line, index) => (
              <div key={index} className="flex">
                <span className="w-12 text-right pr-3 text-gray-400 select-none bg-gray-50">{index + 1}</span>
                <span className={`flex-1 px-3 ${
                  newLines[index] !== line ? 'bg-red-100' : ''
                }`}>{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="bg-green-50 px-4 py-2 font-semibold text-sm border-b border-green-200">
            Modified
          </div>
          <div className="font-mono text-sm">
            {newLines.map((line, index) => (
              <div key={index} className="flex">
                <span className="w-12 text-right pr-3 text-gray-400 select-none bg-gray-50">{index + 1}</span>
                <span className={`flex-1 px-3 ${
                  oldLines[index] !== line ? 'bg-green-100' : ''
                }`}>{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ReviewedCodeView = () => {
    const lines = code.split('\n');
    
    return (
      <div className="font-mono text-sm">
        {lines.map((line, index) => {
          const lineNum = index + 1;
          const aiIssue = aiReviews.find(r => r.line === lineNum);
          const lineComments = comments.filter(c => c.line === lineNum);
          
          return (
            <div key={index}>
              <div className={`flex ${aiIssue && showAiReviews ? getSeverityBgColor(aiIssue.severity) : ''}`}>
                <span className="w-12 text-right pr-3 text-gray-400 select-none bg-gray-50 flex items-center justify-end">
                  {aiIssue && showAiReviews && (
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      aiIssue.severity === 'error' ? 'bg-red-500' :
                      aiIssue.severity === 'warning' ? 'bg-yellow-500' :
                      aiIssue.severity === 'suggestion' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}></span>
                  )}
                  {lineNum}
                </span>
                <span className="flex-1 px-3 py-0.5">{highlightPythonCode(line)}</span>
              </div>
              
              {aiIssue && showAiReviews && (
                <div className={`ml-12 mb-3 border-l-4 p-4 rounded-r ${getSeverityColor(aiIssue.severity)}`}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(aiIssue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span className="font-bold text-sm">AI Code Review</span>
                        <span className="text-xs px-2 py-0.5 bg-white rounded-full border">
                          {aiIssue.category}
                        </span>
                      </div>
                      <p className="font-semibold text-sm mb-2">{aiIssue.issue}</p>
                      <p className="text-sm text-gray-700 mb-2">{aiIssue.explanation}</p>
                      
                      {aiIssue.code && (
                        <div className="mt-2 bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                          {aiIssue.code}
                        </div>
                      )}
                      
                      <div className="mt-3 flex gap-2">
                        <button className="text-xs px-3 py-1 bg-white border rounded hover:bg-gray-50 transition-colors">
                          적용하기
                        </button>
                        <button className="text-xs px-3 py-1 bg-white border rounded hover:bg-gray-50 transition-colors">
                          무시하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {lineComments.map((comment, idx) => (
                <div key={idx} className="ml-12 mb-2 bg-yellow-100 border-l-4 border-yellow-400 p-3 rounded-r">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCode className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Python AI Code Review Editor</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAIReview}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'AI Review'}
            </button>
            <button
              onClick={handleRun}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'editor'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'diff'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Diff View
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'review'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Review ({aiReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'comments'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Comments ({comments.length})
          </button>
        </div>
      </div>

      {/* AI Review Banner */}
      {aiReviews.length > 0 && (
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <span className="font-semibold text-purple-900">
                  AI가 {aiReviews.length}개의 이슈를 발견했습니다
                </span>
                <span className="text-sm text-purple-700 ml-2">
                  ({aiReviews.filter(r => r.severity === 'error').length} 에러, 
                  {aiReviews.filter(r => r.severity === 'warning').length} 경고, 
                  {aiReviews.filter(r => r.severity === 'suggestion').length} 제안)
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAiReviews}
                onChange={(e) => setShowAiReviews(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-purple-900">코드에 표시</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Code Area */}
        <div className="flex-1 overflow-auto bg-white">
          {activeTab === 'editor' && (
            <div className="flex h-full relative">
              <div className="bg-gray-50 border-r border-gray-200">
                {renderLineNumbers(code)}
              </div>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onSelect={updateCursorPosition}
                  onClick={updateCursorPosition}
                  className="absolute inset-0 w-full h-full p-4 pl-4 font-mono text-sm resize-none focus:outline-none bg-transparent caret-blue-600 text-transparent selection:bg-blue-200"
                  spellCheck="false"
                  style={{ 
                    lineHeight: '24px',
                    tabSize: 4,
                    WebkitTextFillColor: 'transparent'
                  }}
                />
                <div className="absolute inset-0 p-4 pl-4 pointer-events-none overflow-hidden">
                  {renderHighlightedCode(code)}
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                Ln {cursorPosition.line}, Col {cursorPosition.col}
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="p-6">
              {renderDiff()}
            </div>
          )}

          {(activeTab === 'review' || activeTab === 'comments') && (
            <div className="p-6 overflow-auto">
              <ReviewedCodeView />
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col">
          {/* Output Section */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-800 mb-3">Output</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm min-h-24 whitespace-pre-wrap">
              {output || '코드를 실행하려면 Run 버튼을 클릭하세요'}
            </div>
          </div>

          {/* Add Comment Section */}
          {activeTab === 'comments' && selectedLine && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">
                  라인 {selectedLine}에 코멘트 추가
                </h3>
                <button
                  onClick={() => setSelectedLine(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="코멘트를 입력하세요..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
              <button
                onClick={handleAddComment}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                코멘트 추가
              </button>
            </div>
          )}

          {/* AI Reviews & Comments List */}
          <div className="flex-1 overflow-auto p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              {activeTab === 'review' ? 'AI Review Summary' : 'All Comments'}
            </h3>
            
            {activeTab === 'review' && aiReviews.length > 0 && (
              <div className="space-y-3">
                {aiReviews.map((review, index) => (
                  <div key={index} className={`border-l-4 p-4 rounded-r ${getSeverityColor(review.severity)}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {getSeverityIcon(review.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-600">Line {review.line}</span>
                          <span className="text-xs px-2 py-0.5 bg-white rounded-full border">
                            {review.category}
                          </span>
                        </div>
                        <p className="font-semibold text-sm mb-1">{review.issue}</p>
                        <p className="text-xs text-gray-600">{review.explanation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'comments' && (
              <div className="space-y-3">
                {comments.map((comment, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600">Line {comment.line}</span>
                      <span className="text-xs text-gray-500">{comment.timestamp}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">{comment.author}</p>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'review' && aiReviews.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">AI Review 버튼을 클릭하여<br/>코드 분석을 시작하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PythonCodeEditor;