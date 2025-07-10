# -- coding: utf-8 --
# @File: tasks.py
# @Time: 2025/5/9 14:56
# @Author: windyzhao
import time

from celery import shared_task

from apps.alerts.common.notify.notify import Notify
from apps.alerts.models import SystemSetting
from apps.alerts.service.alter_operator import BeatUpdateAlertStatu
from apps.alerts.service.notify_service import NotifyResultService
from apps.alerts.service.un_dispatch import UnDispatchService
from apps.core.logger import alert_logger as logger


@shared_task
def event_aggregation_alert():
    """
    按窗口类型分组执行的聚合任务
    支持滑动窗口、固定窗口、会话窗口三种类型
    """
    logger.info("开始执行多窗口类型聚合任务")

    try:
        # 移动导入到函数内部避免循环导入
        from apps.alerts.common.aggregation.smart_scheduler import create_smart_scheduler
        from apps.alerts.common.aggregation.agg_window import WindowProcessorFactory

        # 1. 创建智能调度器，判断当前时间应该执行哪些规则
        scheduler = create_smart_scheduler()
        executable_rules = scheduler.get_executable_rules()

        # 2. 检查是否有可执行的规则
        total_executable_rules = sum(len(rules) for rules in executable_rules.values())
        if total_executable_rules == 0:
            logger.info("当前时间无需执行任何聚合规则")
            return

        # 3. 按窗口类型优先级顺序处理（滑动、固定、会话）
        # window_order = ['sliding', 'fixed', 'session']
        window_order = ['session']
        processing_stats = {}

        for window_type in window_order:
            rules_to_execute = executable_rules.get(window_type, [])
            if not rules_to_execute:
                continue

            logger.info(f"开始处理 {window_type} 窗口类型，规则数量: {len(rules_to_execute)}")

            try:
                # 使用窗口处理器工厂创建处理器并执行
                # 不再传递固定的window_size，让处理器内部处理每个规则的window_size
                alerts_created, alerts_updated = WindowProcessorFactory.process_window_type_rules(
                    window_type=window_type,
                    rules=rules_to_execute
                )

                processing_stats[window_type] = {
                    'rules_count': len(rules_to_execute),
                    'alerts_created': alerts_created,
                    'alerts_updated': alerts_updated,
                    'status': 'success'
                }

                logger.info(f"{window_type} 窗口类型处理完成，创建告警: {alerts_created}, 更新告警: {alerts_updated}")

            except Exception as e:
                logger.error(f"{window_type} 窗口类型处理失败: {str(e)}")
                processing_stats[window_type] = {
                    'rules_count': len(rules_to_execute),
                    'status': 'failed',
                    'error': str(e)
                }

        # 4. 输出处理统计
        logger.info("聚合任务处理统计:")
        total_created = 0
        total_updated = 0

        for window_type, stats in processing_stats.items():
            if stats['status'] == 'success':
                created = stats.get('alerts_created', 0)
                updated = stats.get('alerts_updated', 0)
                total_created += created
                total_updated += updated
                logger.info(f"  {window_type}: 规则数={stats['rules_count']}, 新建告警={created}, 更新告警={updated}")
            else:
                logger.error(f"  {window_type}: 规则数={stats['rules_count']}, 处理失败 - {stats['error']}")

        logger.info(f"多窗口类型聚合任务执行完成，总计: 新建告警={total_created}, 更新告警={total_updated}")

    except Exception as e:
        logger.error(f"聚合任务执行失败: {str(e)}")
        raise


@shared_task
def beat_close_alert():
    """
    告警关闭兜底机制
    """
    logger.info("== beat close alert task start ==")
    beat_update = BeatUpdateAlertStatu(times=3)  # 3个窗口内
    beat_update.beat_close_alert()
    logger.info("== beat close alert task end ==")


@shared_task
def check_and_send_reminders():
    """
    统一的提醒检查任务 - 每分钟执行一次轮询
    检查所有需要发送提醒的告警并处理
    """
    logger.info("== 开始检查提醒任务 ==")
    try:
        from apps.alerts.service.reminder_service import ReminderService
        result = ReminderService.check_and_process_reminders()
        logger.info(f"== 提醒任务检查完成 == 处理={result.get('processed', 0)}, 成功={result.get('success', 0)}")
        return result
    except Exception as e:
        logger.error(f"提醒任务检查失败: {str(e)}")
        return {"processed": 0, "success": 0, "error": str(e)}


@shared_task
def cleanup_reminder_tasks():
    """
    清理过期的提醒任务记录
    每小时执行一次
    """
    logger.info("== 开始清理提醒任务 ==")
    try:
        from apps.alerts.service.reminder_service import ReminderService
        cleaned_count = ReminderService.cleanup_expired_reminders()
        logger.info(f"== 提醒任务清理完成 == 清理了{cleaned_count}条记录")
        return cleaned_count
    except Exception as e:
        logger.error(f"清理提醒任务失败: {str(e)}")
        return 0


@shared_task
def sync_notify(username_list, channel, title, content, object_id="", notify_action_object="alert"):
    """
    同步通知方法
    :param username_list: 用户名列表
    :param channel: 通知渠道
    :param title: 通知标题
    :param content: 通知内容
    :param object_id: 通知对象ID（可选）
    :param notify_action_object: 通知动作对象，默认为"alert"
    """
    send_time = time.time()
    logger.info(
        "=== 开始执行通知任务 time={} username_list={}, channel={} ===".format(send_time, username_list, channel))
    notify = Notify(username_list=username_list, channel=channel, title=title, content=content)
    result = notify.notify()
    logger.info("=== 通知任务执行完成 send_time={}===".format(send_time))
    if object_id:
        notify_result_obj = NotifyResultService(notify_users=username_list, channel=channel, notify_object=object_id,
                                                notify_action_object=notify_action_object, notify_result=result)
        notify_result_obj.save_notify_result()
    return result


@shared_task
def sync_shield(event_list):
    """
    异步屏蔽事件
    """
    logger.info("== 开始执行屏蔽事件任务 ==")
    try:
        from apps.alerts.common.shield import execute_shield_check_for_events
        result = execute_shield_check_for_events(event_list)
        logger.info(f"== 屏蔽事件任务完成 == 处理了{len(event_list)}条事件")
        return result
    except Exception as e:
        logger.error(f"屏蔽事件任务失败: {str(e)}")
        return {"result": False, "error": str(e)}


@shared_task
def sync_no_dispatch_alert_notice_task():
    """
    周期任务，检查那些未能自动分派的告警，进行系统配置的通知
    """
    logger.info("== 开始执行未分派告警通知任务 ==")
    setting_activate = SystemSetting.objects.filter(key="no_dispatch_alert_notice", is_activate=True).exists()
    if not setting_activate:
        logger.info("== 未分派告警通知功能未启用，任务执行结束 ==")
        return

    params = UnDispatchService.notify_un_dispatched_alert_params_format()
    for notify_people, channel, title, content, alerts in params:
        sync_notify(username_list=notify_people, channel=channel, title=title, content=content)

    logger.info("== 未分派告警通知任务执行完成 ==")


@shared_task
def cleanup_session_windows():
    """
    清理过期的会话窗口并生成告警
    每小时执行一次，清理过期和超过大小限制的会话，并为符合条件的过期会话生成告警

    该任务执行以下操作：
    1. 扫描所有过期的会话窗口
    2. 为符合条件的过期会话生成告警
    3. 清理数据库中的过期会话记录
    4. 记录清理统计信息
    """
    logger.info("== 开始清理过期会话窗口并生成告警 ==")
    try:
        from apps.alerts.models import SessionWindow, CorrelationRules
        from apps.alerts.common.aggregation.session_window_processor import SessionWindowProcessor
        from django.utils import timezone

        # 统计信息
        generated_alerts = 0
        cleaned_sessions = 0

        # 获取所有会话窗口相关的关联规则
        session_rules = CorrelationRules.objects.filter(
            window_type='session',
            aggregation_rules__is_active=True
        ).distinct()

        # 为每个规则处理其相关的会话
        for rule in session_rules:
            try:
                processor = SessionWindowProcessor(rule)

                # 处理该规则的过期会话
                rule_alerts_created, rule_alerts_updated = processor._process_expired_sessions()
                generated_alerts += rule_alerts_created

                # 清理该规则的过期会话记录
                rule_cleaned = processor._cleanup_expired_sessions()
                cleaned_sessions += rule_cleaned

                logger.info(f"规则 {rule.name}: 生成告警 {rule_alerts_created}, 清理会话 {rule_cleaned}")

            except Exception as e:
                logger.error(f"处理规则 {rule.name} 的会话清理时出错: {str(e)}")
                continue

        cleanup_stats = {
            "generated_alerts": generated_alerts,
            "cleaned_sessions": cleaned_sessions,
            "status": "success"
        }

        logger.info(f"== 会话窗口清理完成 == 统计信息: {cleanup_stats}")
        return cleanup_stats

    except Exception as e:
        logger.error(f"清理会话窗口失败: {str(e)}")
        return {"generated_alerts": 0, "cleaned_sessions": 0, "error": str(e), "status": "failed"}
