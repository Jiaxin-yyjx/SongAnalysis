import os
import redis
from rq import Worker, Queue, Connection
from urllib.parse import urlparse
import ssl

# Ensure you're using the Heroku Redis URL from the environment variables
# redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# if not redis_url:
#     raise ValueError("REDIS_URL environment variable is not set!")

# # Parse the Redis URL
# url = urlparse(redis_url)
# print("REDIS URL: ", url)
# print("SEGMENT: ", url.hostname, url.port, url.password)

# Configure Redis connection with SSL/TLS support and certificate validation disabled
# redis_conn = redis.StrictRedis(
#     host=url.hostname,
#     port=url.port,
#     password=url.password,
#     ssl=True,
#     ssl_cert_reqs=ssl.CERT_NONE  # Disable certificate validation for self-signed certificates
# )
# redis_conn = redis.StrictRedis(
#     host='ec2-18-206-36-186.compute-1.amazonaws.com',
#     port=23840,
#     db=0,
#     ssl=False,  # Disable SSL encryption
#     ssl_context=None  # Ensure no SSL context is created
# )

# redis_url = os.getenv('REDIS_URL', "redis://localhost:6379/0")

# # Connect to Redis using the URL
# redis_conn = redis.from_url(redis_url, ssl=True, ssl_context=ssl.create_default_context())

# # Optionally, if you need to disable SSL verification (not recommended for production)
# redis_conn.ssl_context.verify_mode = ssl.CERT_NONE
# redis_url = os.getenv('REDIS_TLS_URL')  # Test with REDIS_TLS_URL in your app
# redis_conn = redis.from_url(redis_url, ssl=True, ssl_context=ssl.create_default_context())

# url = urlparse(os.environ.get("REDIS_URL"))
# redis_conn = redis.Redis(host=url.hostname, port=url.port, password=url.password, ssl=(url.scheme == "rediss"), ssl_cert_reqs=None)
from redis_config import get_redis_connection

# Now you can use the same connection everywhere
redis_conn = get_redis_connection()

# redis_conn.ssl_context.verify_mode = ssl.CERT_NONE  # Disable verification

# Listen to the default queue
if __name__ == "__main__":
    with Connection(redis_conn):
        worker = Worker(["default"])
        worker.work()


# import os
# import redis
# from rq import Worker, Queue, Connection

# # Ensure you're using the Heroku Redis URL from the environment variables
# redis_url = os.getenv("REDIS_URL","redis://localhost:6379/0")

# if not redis_url:
#     raise ValueError("REDIS_URL environment variable is not set!")

# # Connect to Redis
# redis_conn = redis.from_url(redis_url)

# # Listen to the default queue
# if __name__ == "__main__":
#     with Connection(redis_conn):
#         worker = Worker(["default"])
#         worker.work()
