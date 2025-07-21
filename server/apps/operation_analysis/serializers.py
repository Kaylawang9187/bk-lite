# -- coding: utf-8 --
# @File: serializers.py
# @Time: 2025/7/18 10:59
# @Author: windyzhao
from rest_framework import serializers
from apps.operation_analysis.models import DataSourceAPIModel


class DataSourceAPIModelSerializer(serializers.ModelSerializer):
    # 格式化时间字段
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    updated_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = DataSourceAPIModel
        fields = "__all__"
        extra_kwargs = {
        }
