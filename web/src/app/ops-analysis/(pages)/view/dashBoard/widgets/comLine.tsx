import React, { useEffect, useState, useRef } from 'react';
import ReactEcharts from 'echarts-for-react';
import ChartLegend from '../components/chartLegend';
import { Spin, Empty } from 'antd';
import { randomColorForLegend } from '@/app/ops-analysis/utils/randomColorForChart';

interface TrendLineProps {
  rawData: any;
  loading?: boolean;
  config?: any;
  onReady?: (ready: boolean) => void;
}

const TrendLine: React.FC<TrendLineProps> = ({
  rawData,
  loading = false,
  onReady,
}) => {
  const [isDataReady, setIsDataReady] = useState(false);
  const chartRef = useRef<any>(null);
  const chartColors = randomColorForLegend();

  const transformData = (rawData: any) => {
    if (!rawData) {
      return { dates: [], values: [] };
    }

    if (Array.isArray(rawData) && rawData.length === 0) {
      return { dates: [], values: [] };
    }

    if (Array.isArray(rawData) && rawData.length > 0) {
      if (
        rawData[0] &&
        typeof rawData[0] === 'object' &&
        rawData[0].namespace_id &&
        rawData[0].data
      ) {
        const allDatesSet = new Set<string>();
        rawData.forEach((namespace: any) => {
          if (namespace.data && Array.isArray(namespace.data)) {
            namespace.data.forEach((item: any[]) => {
              allDatesSet.add(item[0]);
            });
          }
        });
        const dates = Array.from(allDatesSet).sort();

        const series = rawData.map((namespace: any) => {
          const dataMap: { [key: string]: number } = {};
          if (namespace.data && Array.isArray(namespace.data)) {
            namespace.data.forEach((item: any[]) => {
              dataMap[item[0]] = item[1];
            });
          }

          const values = dates.map((date) => dataMap[date] || 0);

          return {
            name: namespace.namespace_id,
            data: values,
          };
        });

        return { dates, series };
      } else {
        const dates = rawData.map((item: any[]) => item[0]);
        const values = rawData.map((item: any[]) => item[1]);
        return { dates, values };
      }
    }
    return { dates: [], values: [] };
  };

  const chartData = transformData(rawData);

  useEffect(() => {
    if (!loading) {
      const hasData = chartData && chartData.dates.length > 0;
      setIsDataReady(hasData);
      if (onReady) {
        onReady(hasData);
      }
    }
  }, [chartData, loading, onReady]);

  const option: any = {
    color: chartColors,
    animation: false,
    calculable: true,
    title: { show: false },
    legend: {
      show: false,
    },
    toolbox: { show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      enterable: true,
      confine: true,
      extraCssText: 'box-shadow: 0 0 3px rgba(150,150,150, 0.7);',
      textStyle: {
        fontSize: 12,
      },
      formatter: function (params: any) {
        if (!params || params.length === 0) return '';
        let content = `<div style="padding: 4px 8px;">
          <div style="margin-bottom: 4px; font-weight: bold;">${params[0].axisValueLabel}</div>`;

        params.forEach((param: any) => {
          content += `
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 6px;"></span>
              <span>${param.seriesName}: ${param.value}</span>
            </div>`;
        });

        content += '</div>';
        return content;
      },
    },
    grid: {
      top: 14,
      left: 10,
      right: 20,
      bottom: 10,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartData?.dates || [],
      nameRotate: -90,
      axisLabel: {
        margin: 15,
        textStyle: {
          color: '#666',
        },
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisTick: {
        show: false,
      },
      axisLabel: {
        formatter: function (value: number) {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
          }
          return value.toString();
        },
        textStyle: {
          color: '#666',
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed',
        },
      },
    },
  };

  // 根据数据类型设置 series
  if (chartData && chartData.series) {
    option.series = chartData.series.map((item: any) => ({
      name: item.name,
      type: 'line',
      data: item.data,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        width: 1,
      },
      emphasis: {
        focus: 'series',
      },
    }));
  } else {
    option.series = [
      {
        name: '告警数',
        type: 'line',
        data: chartData && chartData.values ? chartData.values : [],
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 1,
        },
        emphasis: {
          focus: 'series',
        },
      },
    ];
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Spin size="small" />
      </div>
    );
  }

  if (!isDataReady || !chartData || chartData.dates.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 图表区域 */}
      <div className="flex-1">
        <ReactEcharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
        />
      </div>

      {chartData?.series && chartData.series.length > 0 && (
        <div className="w-32 ml-2 flex-shrink-0 h-full">
          <ChartLegend
            chart={chartRef.current?.getEchartsInstance()}
            data={chartData.series}
            colors={chartColors}
          />
        </div>
      )}
    </div>
  );
};

export default TrendLine;
