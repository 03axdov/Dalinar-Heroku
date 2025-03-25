web: gunicorn Dalinar.wsgi --log-file -
release: python manage.py migrate
worker: celery -A Dalinar.celery worker --pool=solo -l info