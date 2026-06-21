import sys
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# Disable rate limiting for seamless developer ingestion
limiter = Limiter(key_func=get_remote_address, enabled=False)
