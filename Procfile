web: gunicorn Dalinar.wsgi --log-file -
release: python manage.py migrate
worker: celery -A Dalinar.celery worker --pool=eventlet -c 3 -l info -Q default