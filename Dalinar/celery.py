import os
import ssl
from celery import Celery
from django.conf import settings
from kombu import Exchange, Queue

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Dalinar.settings')

app = Celery('Dalinar')
app.config_from_object(settings, namespace='CELERY')

redis_url = os.environ.get('REDIS_URL')

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
