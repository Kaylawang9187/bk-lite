from django.http import JsonResponse
from django.utils.translation import gettext as _
from rest_framework.decorators import action

from apps.core.decorators.api_perminssion import HasPermission
from apps.system_mgmt.models import Group, User
from apps.system_mgmt.serializers.group_serializer import GroupSerializer
from apps.system_mgmt.utils.group_utils import GroupUtils
from apps.system_mgmt.utils.viewset_utils import ViewSetUtils


class GroupViewSet(ViewSetUtils):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    @action(detail=False, methods=["GET"])
    @HasPermission("user_list-View")
    def search_group_list(self, request):
        queryset = Group.objects.all()
        # 构建嵌套组结构
        groups_data = GroupUtils.build_group_tree(queryset)
        return JsonResponse({"result": True, "data": groups_data})

    @action(detail=False, methods=["GET"])
    @HasPermission("user_list-View")
    def get_detail(self, request):
        group = Group.objects.get(id=request.GET["group_id"])
        return JsonResponse(
            {"result": True, "data": {"name": group.name, "id": group.id, "parent_id": group.parent_id}}
        )

    @action(detail=False, methods=["POST"])
    @HasPermission("user_list-Add")
    def create_group(self, request):
        params = request.data
        group = Group.objects.create(
            parent_id=params.get("parent_group_id", 0),
            name=params["group_name"],
        )
        data = {"id": group.id, "name": group.name, "parent_id": group.parent_id, "subGroupCount": 0, "subGroups": []}
        return JsonResponse({"result": True, "data": data})

    @action(detail=False, methods=["POST"])
    @HasPermission("user_list-Edit")
    def update_group(self, request):
        Group.objects.filter(id=request.data.get("group_id")).update(name=request.data.get("group_name"))
        return JsonResponse({"result": True})

    @action(detail=False, methods=["POST"])
    @HasPermission("user_list-Delete")
    def delete_groups(self, request):
        kwargs = request.data
        group_id = int(kwargs["id"])

        # 一次性获取所有组
        all_groups = Group.objects.all().values("id", "parent_id")

        # 构建父子关系映射
        child_map = {}
        for group in all_groups:
            parent_id = group["parent_id"]
            if parent_id not in child_map:
                child_map[parent_id] = []
            child_map[parent_id].append(group["id"])

        # 收集所有需要删除的组ID(当前组及其所有子组)
        groups_to_delete = []

        def collect_groups_to_delete(parent_id):
            groups_to_delete.append(parent_id)
            # 查找所有子组(从内存映射中)
            if parent_id in child_map:
                for child_id in child_map[parent_id]:
                    collect_groups_to_delete(child_id)

        # 开始收集
        collect_groups_to_delete(group_id)

        # 一次性检查这些组中是否有用户
        users = User.objects.filter(group_list__overlap=groups_to_delete).exists()
        if users:
            return JsonResponse(
                {"result": False, "message": _("This group or sub groups has users, please remove the users first!")}
            )

        # 删除所有收集到的组
        Group.objects.filter(id__in=groups_to_delete).delete()
        return JsonResponse({"result": True})
