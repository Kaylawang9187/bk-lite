from loguru import logger

from src.tools.python_tools import python_analyze_repl
from src.tools.time_tools import get_current_time


def test_python_analyze_repl():
    result = python_analyze_repl.run("print('123')", config={
        'configurable': {
            'user_id': '1'
        }
    })
    logger.info(result)
