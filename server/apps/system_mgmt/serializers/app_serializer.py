from django.utils.translation import gettext as _
from rest_framework import serializers

from apps.system_mgmt.models import App


class AppSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = App
        fields = "__all__"

    @staticmethod
    def get_display_name(obj):
        # 如果是内置模块，翻译name
        if obj.is_build_in:
            return _(obj.description)
            # 否则返回原始name
        return obj.description

    def to_representation(self, instance):
        # 获取标准的序列化表示
        data = super().to_representation(instance)
        # 当是GET请求时，将name替换为已翻译的name
        if self.context.get("request") and self.context["request"].method == "GET":
            data["description"] = data["display_name"]
        # 删除辅助字段，避免在响应中包含
        if "display_name" in data:
            del data["display_name"]
        return data

    def create(self, validated_data):
        validated_data["is_build_in"] = False
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("is_build_in", None)
        return super().update(instance, validated_data)
