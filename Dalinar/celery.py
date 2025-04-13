from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from django.conf import settings
from kombu import Queue

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Dalinar.settings')

app = Celery('Dalinar')
app.config_from_object(settings, namespace='CELERY')

app.conf.task_queues = (
    Queue('default'),
    Queue('training'),
)

app.conf.task_routes = {
    'api.tasks.train_model_task': {'queue': 'training'},
    'api.tasks.train_model_tensorflow_dataset_task': {'queue': 'training'},
}

app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")