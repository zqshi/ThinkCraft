import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """配置类"""
    # Flask配置
    HOST = os.getenv('DEEPRESEARCH_HOST', '0.0.0.0')
    PORT = int(os.getenv('DEEPRESEARCH_PORT', 5001))
    DEBUG = os.getenv('DEEPRESEARCH_DEBUG', 'False').lower() == 'true'

    # DeepResearch API配置
    DEEPRESEARCH_API_KEY = os.getenv('DEEPRESEARCH_API_KEY', '')
    DEEPRESEARCH_API_URL = os.getenv('DEEPRESEARCH_API_URL', 'https://api.deepresearch.ai')

    # 超时配置
    REQUEST_TIMEOUT = int(os.getenv('DEEPRESEARCH_TIMEOUT', 600))  # 10分钟

    # 重试配置
    MAX_RETRIES = int(os.getenv('DEEPRESEARCH_MAX_RETRIES', 5))
    RETRY_DELAY = int(os.getenv('DEEPRESEARCH_RETRY_DELAY', 1000))  # 毫秒
