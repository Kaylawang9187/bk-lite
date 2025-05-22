from django.db.models import Q
from django.http import JsonResponse
from rest_framework.decorators import action

from apps.core.backends import cache
from apps.core.decorators.api_perminssion import HasPermission
from apps.system_mgmt.models import Menu, Role, User
from apps.system_mgmt.serializers.role_serializer import RoleSerializer
from apps.system_mgmt.services.role_manage import RoleManage
from apps.system_mgmt.utils.viewset_utils import ViewSetUtils


class RoleViewSet(ViewSetUtils):
    queryset = Role.objects.exclude(app="")
    serializer_class = RoleSerializer

    @action(detail=False, methods=["POST"])
    @HasPermission("application_role-View")
    def search_role_list(self, request):
        client_id = request.data.get("client_id", [])
        if not isinstance(client_id, list):
            client_id = [client_id]
        data = Role.objects.filter(app__in=client_id).values("id", "name")
        return JsonResponse({"result": True, "data": list(data)})

    @action(detail=False, methods=["POST"])
    @HasPermission("application_role-View")
    def get_role_tree(self, request):
        client_list = request.data.get("client_list", [])
        return_data = []
        client_ids = [i["name"] for i in client_list]
        roles = Role.objects.filter(app__in=client_ids).values("id", "name", "app").order_by("id")
        role_map = {}
        for i in roles:
            role_map.setdefault(i["app"], []).append(
                {
                    "id": i["id"],
                    "name": i["name"],
                }
            )
        for client_obj in client_list:
            app_role = role_map.get(client_obj["name"], [])
            return_data.append({"id": client_obj["id"] * 886, "name": client_obj["name"], "children": app_role})
        return JsonResponse({"result": True, "data": return_data})

    @action(detail=False, methods=["GET"])
    def search_role_users(self, request):
        search = request.GET.get("search", "")
        role_id = request.GET.get("role_id", "0")
        # 过滤用户数据
        queryset = User.objects.filter(role_list__contains=int(role_id)).filter(
            Q(username__icontains=search) | Q(display_name__icontains=search) | Q(email__icontains=search)
        )
        data, total = self.search_by_page(queryset, request, User.display_fields())
        return JsonResponse({"result": True, "data": data})

    @action(detail=False, methods=["GET"])
    def get_all_menus(self, request):
        client_id = request.GET.get("client_id")
        data = RoleManage().get_all_menus(client_id, is_superuser=True)
        return JsonResponse({"result": True, "data": data})

    @action(detail=False, methods=["GET"])
    def get_role_menus(self, request):
        role_id = request.GET.get("role_id")
        menus = Role.objects.get(id=role_id).menu_list
        return_data = Menu.objects.filter(id__in=menus).values_list("name", flat=True)
        return JsonResponse({"result": True, "data": list(return_data)})

    @action(detail=False, methods=["POST"])
    def create_role(self, request):
        role_obj = Role.objects.create(
            app=request.data.get("client_id"),
            name=request.data["name"],
        )
        return_data = {"id": role_obj.id, "name": role_obj.name}
        return JsonResponse({"result": True, "data": return_data})

    @action(detail=False, methods=["POST"])
    def delete_role(self, request):
        role_id = request.data.get("role_id")
        role_name = request.data.get("role_name")
        if role_name in ["admin", "normal"]:
            return JsonResponse({"result": False, "message": "admin和normal角色不允许删除"})
        users = User.objects.filter(role_list__contains=int(role_id)).values_list("username", flat=True)
        if users:
            msg = "、".join([i["username"] for i in list(users)])
            return JsonResponse({"result": False, "message": f"角色已被下列用户使用：{msg}！"})
        Role.objects.filter(id=role_id).delete()
        return JsonResponse({"result": True})

    @action(detail=False, methods=["POST"])
    def update_role(self, request):
        Role.objects.filter(id=request.data.get("role_id")).update(name=request.data.get("role_name"))
        return JsonResponse({"result": True})

    @action(detail=False, methods=["POST"])
    def add_user(self, request):
        pk = request.data.get("role_id")
        user_ids = request.data.get("user_ids")
        user_list = User.objects.filter(id__in=user_ids)
        for i in user_list:
            if pk not in i.role_list:
                i.role_list.append(int(pk))
        User.objects.bulk_update(user_list, ["role_list"], batch_size=100)
        return JsonResponse({"result": True})

    @action(detail=False, methods=["POST"])
    def delete_user(self, request):
        pk = int(request.data.get("role_id"))
        user_ids = request.data.get("user_ids")
        user_list = User.objects.filter(id__in=user_ids)
        for i in user_list:
            if pk in i.role_list:
                i.role_list.remove(pk)
        User.objects.bulk_update(user_list, ["role_list"], batch_size=100)
        return JsonResponse({"result": True})

    @action(detail=False, methods=["POST"])
    def set_role_menus(self, request):
        params = request.data
        role_id = params.get("role_id")
        menus = params.get("menus")
        role_obj = Role.objects.get(id=role_id)
        menu_ids = Menu.objects.filter(app=role_obj.app, name__in=menus).values_list("id", flat=True)
        role_obj.menu_list = list(menu_ids)
        role_obj.save()
        cache_key = f"all_menus_{role_obj.app}"
        keys = RoleManage.get_cache_keys(cache_key)
        cache.delete_many(keys)
        return JsonResponse({"result": True})
