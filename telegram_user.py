from pydantic import BaseModel, model_validator
import hmac
import hashlib
from os import getenv


BOT_TOKEN = getenv('BOT_TOKEN')

def is_correct_telegram_user(values: dict) -> bool:
    query_hash = values.pop('hash', None)
    if not query_hash:
        return False
    
    data_check_string = '\n'.join(sorted(f'{x}={y}' for x, y in values.items if x not in ('hash', 'next')))
    computed_hash = hmac.new(hashlib.sha256(BOT_TOKEN.encode()).digest(), data_check_string.encode(), 'sha256').hexdigest()
    is_correct = hmac.compare_digest(computed_hash, query_hash)
    return is_correct
