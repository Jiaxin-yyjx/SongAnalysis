import redis
import ssl
import os
from urllib.parse import urlparse

def get_redis_connection():
    # Get REDIS_URL from environment variable or default to local Redis
    redis_url = os.getenv('REDIS_URL', "redis://localhost:6379/0")
    
    # Parse the URL to extract components like hostname, port, etc.
    url = urlparse(redis_url)
    
    # If REDIS_URL points to a Redis instance with SSL (rediss://), we enable SSL
    redis_conn = redis.Redis(
        host=url.hostname,        # Redis host (either local or from REDIS_URL)
        port=url.port,            # Redis port (either local or from REDIS_URL)
        password=url.password,    # Redis password (if any in REDIS_URL)
        ssl=(url.scheme == "rediss"),  # Enable SSL if scheme is "rediss"
        ssl_cert_reqs=None        # Optionally specify SSL certificate requirements, None means no verification
    )
    
    return redis_conn