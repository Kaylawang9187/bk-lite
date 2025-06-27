# -- coding: utf-8 --
# @File: config.py
# @Time: 2025/5/9 14:56
# @Author: windyzhao
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'event_aggregation_alert': {
        'task': 'apps.alerts.tasks.event_aggregation_alert',
        'schedule': crontab(minute='*'),  # 每分钟执行
    },
    'beat_close_alert': {
        'task': 'apps.alerts.tasks.beat_close_alert',
        'schedule': crontab(minute='*/5'),  # 每5分钟执行
    },
    'check_and_send_reminders': {
        'task': 'apps.alerts.tasks.check_and_send_reminders',
        'schedule': crontab(minute='*'),  # 每分钟执行
    },
    'cleanup_reminder_tasks': {
        'task': 'apps.alerts.tasks.cleanup_reminder_tasks',
        'schedule': crontab(minute='0', hour='*'),  # 每小时执行
    },
    'sync_reminder_configurations': {
        'task': 'apps.alerts.tasks.sync_reminder_configurations',
        'schedule': crontab(minute='0', hour='*'),  # 每小时执行
    },
}
