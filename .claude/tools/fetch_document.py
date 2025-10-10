#!/usr/bin/env python3
import sys
import json
import subprocess
import re
from html.parser import HTMLParser
from io import StringIO

class HTMLTextExtractor(HTMLParser):
    """HTML에서 텍스트만 추출"""
    def __init__(self):
        super().__init__()
        self.text = StringIO()
        self.skip_tags = {'script', 'style', 'meta', 'link'}
        self.current_tag = None
        
    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        
    def handle_data(self, data):
        if self.current_tag not in self.skip_tags:
            self.text.write(data)
            
    def get_text(self):
        return self.text.getvalue()

def fetch_url(url, extract_text=True):
    """URL에서 컨텐츠 가져오기"""
    try:
        # curl로 컨텐츠 가져오기 (리다이렉트 따라가기, 타임아웃 설정)
        cmd = [
            'curl', '-L',  # 리다이렉트 따라가기
            '-s',  # silent
            '--max-time', '30',  # 30초 타임아웃
            '-H', 'User-Agent: Mozilla/5.0 (compatible; ClaudeBot/1.0)',
            url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': f'curl failed: {result.stderr}',
                'url': url
            }
        
        content = result.stdout
        
        # 텍스트 추출 여부
        if extract_text and '<html' in content.lower():
            parser = HTMLTextExtractor()
            parser.feed(content)
            text = parser.get_text()
            
            # 공백 정리
            text = re.sub(r'\n\s*\n', '\n\n', text)
            text = re.sub(r' +', ' ', text)
            text = text.strip()
            
            return {
                'success': True,
                'url': url,
                'content_type': 'html',
                'text': text,
                'raw_length': len(content),
                'text_length': len(text)
            }
        else:
            return {
                'success': True,
                'url': url,
                'content_type': 'raw',
                'content': content,
                'length': len(content)
            }
            
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Request timeout (30s)',
            'url': url
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'url': url
        }

def main():
    try:
        # stdin에서 JSON 입력 받기
        input_data = json.loads(sys.stdin.read())
        
        url = input_data.get('url')
        extract_text = input_data.get('extract_text', True)
        
        if not url:
            print(json.dumps({'success': False, 'error': 'URL is required'}))
            sys.exit(1)
        
        result = fetch_url(url, extract_text)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'success': False, 'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()