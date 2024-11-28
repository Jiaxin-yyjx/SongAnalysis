import os
from redis import Redis
from rq import Queue
from urllib.parse import urlparse
import redis
import ssl

# Redis connection URL
# url = urlparse(os.environ.get("REDIS_URL"))
# redis_conn = redis.Redis(host=url.hostname, port=url.port, password=url.password, ssl=(url.scheme == "rediss"), ssl_cert_reqs=None)
# redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# url = urlparse(redis_url)
# print("REDIS URL: ", url)
# print("SEGMENT: ", url.hostname, url.port, url.password)

# # Configure Redis connection with SSL/TLS support and certificate validation disabled
# redis_conn = redis.StrictRedis(
#     host=url.hostname,
#     port=url.port,
#     password=url.password,
#     ssl=True,
#     ssl_cert_reqs=ssl.CERT_NONE  # Disable certificate validation for self-signed certificates
# )
from redis_config import get_redis_connection

# Now you can use the same connection everywhere
redis_conn = get_redis_connection()
# print("REDIS CONN: ", redis_conn)

# Create the RQ queue
queue = Queue(connection=redis_conn)
# print("QUEUE: ", queue)