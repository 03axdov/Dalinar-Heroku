web: gunicorn Dalinar.wsgi --log-file -

worker: celery -A Dalinar.celery worker --pool=solo -l info