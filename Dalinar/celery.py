from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
import ssl
from django.conf import settings
from kombu import Exchange, Queue

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Dalinar.settings')

app = Celery('Dalinar')
app.config_from_object(settings, namespace='CELERY')

app.conf.broker_transport_options = settings.CELERY_BROKER_TRANSPORT_OPTIONS
app.conf.broker_pool_limit = settings.CELERY_BROKER_POOL_LIMIT

app.conf.result_expires = 60  # 1 minute

app.conf.result_backend_transport_options = {
    'max_connections': 2,
}
app.conf.result_backend_pool_limit = 2

# Ensure tasks are acknowledged *after* completion (important for spot preemption)
app.conf.task_acks_late = True

# Ensure tasks are re-queued if the worker is terminated
app.conf.task_reject_on_worker_lost = True

# Prevent workers from grabbing too many tasks at once
app.conf.worker_prefetch_multiplier = 1

# Track when tasks start (optional but useful for monitoring)
app.conf.task_track_started = True

# Disable rate limits (improves performance slightly)
app.conf.worker_disable_rate_limits = True

redis_url = "redis://127.0.0.1:6379"    # Change for production

# Only apply SSL if using rediss:// scheme
if redis_url.startswith("rediss://"):
    ssl_options = {
        "ssl_cert_reqs": ssl.CERT_NONE
    }

    # For Celery broker (Redis transport)
    app.conf.broker_use_ssl = ssl_options

    # For Redis result backend — this works if you’re using Redis as result backend too
    app.conf.redis_backend_use_ssl = ssl_options

# Must be set regardless of SSL
app.conf.broker_url = redis_url
app.conf.result_backend = redis_url

app.conf.task_queues = (
    Queue('default', Exchange('default'), routing_key='default'),
    Queue('training', Exchange('training'), routing_key='training'),
)

app.conf.task_default_queue = 'default'
app.conf.task_default_exchange = 'default'
app.conf.task_default_routing_key = 'default'

app.conf.task_routes = {
    'api.tasks.train_model_task': {'queue': 'training'},
    'api.tasks.train_model_tensorflow_dataset_task': {'queue': 'training'},
}

app.autodiscover_tasks()