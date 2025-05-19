from pydantic import BaseModel, model_validator
import hmac
import hashlib
from os import getenv


BOT_TOKEN = getenv('BOT_TOKEN')


class TelegramUser(BaseModel):
    auth_date: int
    first_name: str
    id: int
    username: str
    hash: str

    @model_validator(mode='before')
    def check_hash(cls, values: dict[str, any]) -> dict[str, any]:
        data_check_keys = sorted(
            k for k in values.keys() if k != 'hash' and values[k] is not None
        )
        data_check_string = '\n'.join(f"{k}={values[k]}" for k in data_check_keys)
        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if computed_hash != values.get('hash'):
            raise ValueError(f'Invalid login data, {computed_hash} != {values.get('hash')}')
        print('Успех!')
        return values
