import logging
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import viewsets
from rest_framework.decorators import action

from apps.core.services.user_group import UserGroup
from apps.core.utils.web_utils import WebUtils
from apps.rpc.system_mgmt import SystemMgmt

logger = logging.getLogger(__name__)


class UserGroupViewSet(viewsets.ViewSet):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.system_mgmt_client = SystemMgmt()

    def get_pagination_params(self, params):
        """获取分页参数"""
        try:
            page = int(params.get("page", 1))
            page_size = int(params.get("page_size", 20))
            first = (page - 1) * page_size
            return first, page_size
        except (ValueError, TypeError):
            return 0, 20

    @swagger_auto_schema(
        operation_id="user_list",
        operation_description="查询用户列表",
        manual_parameters=[
            openapi.Parameter("page", in_=openapi.IN_QUERY, type=openapi.TYPE_INTEGER),
            openapi.Parameter("page_size", in_=openapi.IN_QUERY, type=openapi.TYPE_INTEGER),
            openapi.Parameter("search", in_=openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ],
    )
    @action(methods=["get"], detail=False)
    def user_list(self, request):
        try:
            first, max_size = self.get_pagination_params(request.query_params)
            search = request.query_params.get("search", "")
            
            data = UserGroup().user_list(
                self.system_mgmt_client, 
                query_params={
                    "first": first, 
                    "max": max_size,
                    "search": search
                }
            )
            return WebUtils.response_success(data)
        except Exception as e:
            logger.error(f"User list query failed: {e}")
            return WebUtils.response_error("获取用户列表失败")

    @swagger_auto_schema(
        operation_id="group_list",
        operation_description="组列表",
        manual_parameters=[
            openapi.Parameter("search", in_=openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ],
    )
    @action(methods=["get"], detail=False)
    def group_list(self, request):
        try:
            search = request.query_params.get("search", "")
            
            data = UserGroup().groups_list(
                system_mgmt_client=self.system_mgmt_client,
                query_params=search
            )
            return WebUtils.response_success(data)
        except Exception as e:
            logger.error(f"Group list query failed: {e}")
            return WebUtils.response_error("获取组列表失败")

    @swagger_auto_schema(
        operation_id="user_groups",
        operation_description="用户组列表",
    )
    @action(methods=["get"], detail=False)
    def user_groups(self, request):
        try:
            data = UserGroup().user_groups_list(request)
            return WebUtils.response_success(data)
        except Exception as e:
            logger.error(f"User groups query failed: {e}")
            return WebUtils.response_error("获取用户组列表失败")
