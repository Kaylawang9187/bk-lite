"""
Plan and Execute Agent SSE 处理器

简化版实现，使用与其他工作正常的SSE相同的模式
"""
import asyncio
import json
from typing import Dict, Any, AsyncGenerator
from datetime import datetime

from sanic.log import logger


async def stream_plan_execute_response(
    workflow,
    body: Dict[str, Any],
    chat_id: str,
    model: str = "plan-execute"
) -> AsyncGenerator[str, None]:
    """
    流式处理 Plan and Execute Agent 响应
    使用简化的标准SSE格式，提供优雅的用户体验
    """
    created = int(datetime.now().timestamp())
    sent_contents = set()  # 用于去重
    
    try:
        logger.info(f"[Plan Execute SSE] 开始流式处理，chat_id: {chat_id}")
        
        # 发送开始消息
        start_content = "🎯 **开始分析您的请求**\n\n正在制定执行计划..."
        yield _create_sse_data(chat_id, created, model, start_content)
        sent_contents.add(start_content)
        await asyncio.sleep(0.1)
        
        # 获取流式迭代器
        stream_iter = await workflow.stream(body)
        
        async for chunk in stream_iter:
            logger.debug(f"[Plan Execute SSE] 收到 chunk: {type(chunk)}")
            
            if not chunk:
                continue
            
            # chunk 是一个 tuple，包含消息对象
            if isinstance(chunk, (tuple, list)) and len(chunk) > 0:
                message = chunk[0]
                
                # 提取消息内容
                content = _extract_message_content(message)
                
                if content and content not in sent_contents:
                    # 使用标准的OpenAI SSE格式
                    yield _create_sse_data(chat_id, created, model, content)
                    sent_contents.add(content)
                    logger.info(f"[Plan Execute SSE] 发送内容: {content[:50]}...")
                    await asyncio.sleep(0.1)  # 适当延迟提供更好的流式体验
        
        # 发送结束标志
        end_response = {
            "id": chat_id,
            "object": "chat.completion.chunk",
            "created": created, 
            "model": model,
            "choices": [{
                "delta": {},
                "index": 0,
                "finish_reason": "stop"
            }]
        }
        
        json_str = json.dumps(end_response, ensure_ascii=False, separators=(',', ':'))
        yield f"data: {json_str}\n\n"
        
        logger.info(f"[Plan Execute SSE] 流式处理完成，chat_id: {chat_id}")
        
    except Exception as e:
        logger.error(f"[Plan Execute SSE] 处理过程中出错: {str(e)}", exc_info=True)
        # 发送错误消息
        error_content = f"❌ **处理过程中出现错误**\n\n{str(e)}"
        yield _create_sse_data(chat_id, created, model, error_content, finish_reason="stop")


def _create_sse_data(chat_id: str, created: int, model: str, content: str, finish_reason: str = None) -> str:
    """创建SSE数据"""
    response = {
        "id": chat_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [{
            "delta": {
                "role": "assistant",
                "content": content
            },
            "index": 0,
            "finish_reason": finish_reason
        }]
    }
    
    json_str = json.dumps(response, ensure_ascii=False, separators=(',', ':'))
    return f"data: {json_str}\n\n"


def _extract_message_content(message: Any) -> str:
    """
    从消息对象中提取内容，优化显示效果
    """
    content = ""
    
    try:
        message_type = type(message).__name__
        logger.debug(f"[Plan Execute SSE] 处理消息类型: {message_type}")
        
        # 检查消息是否有content属性
        if hasattr(message, 'content'):
            raw_content = message.content
            logger.debug(f"[Plan Execute SSE] 消息内容: {raw_content}")
            
            if isinstance(raw_content, str) and raw_content.strip():
                content = raw_content.strip()
                
                # 优化显示逻辑
                if "ToolMessage" in message_type:
                    # 工具结果通常很长，需要格式化
                    content = _format_tool_result(content)
                elif "AIMessage" in message_type:
                    # AI消息需要过滤和美化
                    content = _format_ai_message(content)
                elif "SystemMessage" in message_type:
                    # 跳过系统消息
                    return ""
                elif "HumanMessage" in message_type:
                    # 用户消息通常是内部流程，可能需要过滤
                    if _is_internal_process_message(content):
                        return ""
                    content = f"� 思考: {content}"
                else:
                    content = _format_general_message(content)
                    
        # 检查消息是否有其他可能的内容字段
        elif hasattr(message, 'text'):
            content = message.text.strip() if message.text else ""
        elif hasattr(message, 'data'):
            content = str(message.data).strip() if message.data else ""
        
        return content
        
    except Exception as e:
        logger.error(f"[Plan Execute SSE] 提取消息内容失败: {str(e)}")
        return ""


def _format_tool_result(content: str) -> str:
    """格式化工具执行结果"""
    # 如果是很长的结果，只显示摘要
    if len(content) > 500:
        return f"🔧 工具执行完成\n\n📊 获取到详细的信息，正在整理..."
    else:
        return f"🔧 {content}"


def _format_ai_message(content: str) -> str:
    """格式化AI消息，提取关键信息"""
    try:
        # 尝试解析JSON格式的计划
        if content.startswith('{"steps"'):
            import json
            data = json.loads(content)
            if "steps" in data:
                steps = data["steps"]
                formatted_steps = "\n".join([f"  {i+1}. {step}" for i, step in enumerate(steps)])
                return f"📋 **制定执行计划**\n\n{formatted_steps}"
        
        # 尝试解析action格式
        elif content.startswith('{"action"'):
            # 这通常是最终结果，格式化输出
            import json
            data = json.loads(content)
            if "action" in data and "response" in data["action"]:
                response = data["action"]["response"]
                return f"✅ **任务完成**\n\n{response}"
        
        # 其他AI消息
        elif "步骤" in content or "计划" in content:
            return f"📋 **规划阶段**\n\n{content}"
        elif "最终答案" in content or "任务完成" in content:
            return f"✅ **执行完成**\n\n{content}"
        else:
            return f"🤖 {content}"
            
    except:
        # JSON解析失败，直接返回内容
        return f"🤖 {content}"


def _format_general_message(content: str) -> str:
    """格式化一般消息"""
    if "执行步骤" in content:
        return f"⚡ **执行中**\n\n{content}"
    elif "完成" in content:
        return f"✅ {content}"
    else:
        return f"📝 {content}"


def _is_internal_process_message(content: str) -> bool:
    """判断是否是内部流程消息，需要过滤"""
    internal_patterns = [
        "You are tasked with executing step",
        "For the following plan:",
        "已完成的步骤:",
        "如果这是最后一个步骤",
        "所有计划步骤已完成",
        "请根据以下执行结果综合给出最终答案",
        "重要说明：",
        "请直接提供最终的答案"
    ]
    
    for pattern in internal_patterns:
        if pattern in content:
            return True
    return False


def _extract_meaningful_content(node_name: str, node_data: Any) -> str:
    """
    提取有意义的内容，尽量保留更多信息
    """
    content = ""
    
    try:
        logger.debug(f"[Plan Execute SSE] 处理节点 {node_name}, 数据类型: {type(node_data)}")
        
        if isinstance(node_data, dict):
            # 从messages中提取内容
            if "messages" in node_data and isinstance(node_data["messages"], list):
                for message in node_data["messages"]:
                    if isinstance(message, dict):
                        msg_content = message.get("content", "")
                        if isinstance(msg_content, str) and msg_content.strip():
                            # 只过滤明显的技术内容
                            if not _is_obvious_technical_message(msg_content):
                                content = msg_content.strip()
                                logger.debug(f"[Plan Execute SSE] 从messages提取内容: {content[:50]}...")
                                break
            
            # 直接提取内容字段
            elif "content" in node_data:
                msg_content = node_data["content"]
                if isinstance(msg_content, str) and msg_content.strip():
                    if not _is_obvious_technical_message(msg_content):
                        content = msg_content.strip()
                        logger.debug(f"[Plan Execute SSE] 从content字段提取内容: {content[:50]}...")
        
        elif isinstance(node_data, str) and node_data.strip():
            if not _is_obvious_technical_message(node_data):
                content = node_data.strip()
                logger.debug(f"[Plan Execute SSE] 直接提取字符串内容: {content[:50]}...")
        
        # 为不同节点添加适当的前缀
        if content:
            if node_name == "agent":
                content = f"📋 规划: {content}"
            elif node_name == "act":
                content = f"⚡ 执行: {content}"
            elif node_name == "replan":
                content = f"🔄 重新规划: {content}"
            else:
                content = f"🔸 {node_name}: {content}"
        
        return content
        
    except Exception as e:
        logger.error(f"[Plan Execute SSE] 提取内容失败: {str(e)}")
        return ""


def _is_obvious_technical_message(content: str) -> bool:
    """
    判断是否是明显的技术性消息，减少过滤条件
    """
    if not content or len(content.strip()) < 3:
        return True
    
    # 只过滤最明显的技术内容
    obvious_technical_patterns = [
        "tool_call_id:",
        "function_call:",
        "usage_metadata:",
        "response_metadata:",
        '"type":"function"',
        '"role":"function"',
        '{"id":"',
        '{"object":"',
        "uuid-"
    ]
    
    content_lower = content.lower()
    
    # 检查是否包含明显的技术模式
    for pattern in obvious_technical_patterns:
        if pattern in content_lower:
            logger.debug(f"[Plan Execute SSE] 过滤技术内容: {pattern}")
            return True
    
    # 过滤纯JSON格式但长度较短的内容
    if (content.strip().startswith('{') and content.strip().endswith('}') and 
        len(content.strip()) < 50):
        try:
            json.loads(content)
            logger.debug(f"[Plan Execute SSE] 过滤短JSON内容")
            return True
        except:
            pass
    
    return False
