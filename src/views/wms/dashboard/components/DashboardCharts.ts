import type { EChartsOption } from "echarts";

const COLORS = {
  primary: "#409EFF",
  success: "#67C23A",
  warning: "#E6A23C",
  danger: "#F56C6C",
  info: "#909399"
};
function textColor(isDark: boolean) {
  return isDark ? "#ccc" : "#333";
}

function gridColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
}

function tooltipBg(isDark: boolean) {
  return isDark ? "rgba(50,50,50,0.9)" : "rgba(255,255,255,0.95)";
}

function tooltipBorder(isDark: boolean) {
  return isDark ? "#555" : "#ddd";
}

/** 饼图 — 单据类型分布 */
export function getPieOption(
  data: { name: string; value: number }[],
  isDark: boolean
): EChartsOption {
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: tooltipBg(isDark),
      borderColor: tooltipBorder(isDark),
      textStyle: { color: textColor(isDark) },
      extraCssText: "border-radius:8px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);",
      formatter: "{b}: {c} 单 ({d}%)"
    },
    legend: {
      bottom: 0,
      left: "center",
      textStyle: { color: textColor(isDark) }
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "45%"],
        roseType: "radius",
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark ? "#1d1e1f" : "#fff",
          borderWidth: 2
        },
        label: {
          color: textColor(isDark),
          formatter: "{b}\n{d}%"
        },
        data: data.map((d, i) => ({
          ...d,
          itemStyle: {
            color: [COLORS.primary, COLORS.success, COLORS.warning][
              i % 3
            ]
          }
        }))
      }
    ],
    animationDuration: 600
  };
}

/** 分组柱状图 — 近 N 天出入库趋势 */
export function getBarOption(
  data: { name: string; inboundCount: number; outboundCount: number }[],
  isDark: boolean
): EChartsOption {
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg(isDark),
      borderColor: tooltipBorder(isDark),
      textStyle: { color: textColor(isDark) },
      extraCssText: "border-radius:8px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);"
    },
    legend: {
      data: ["入库", "出库"],
      textStyle: { color: textColor(isDark) },
      top: 0
    },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => d.name),
      axisLine: { lineStyle: { color: gridColor(isDark) } },
      axisLabel: { color: textColor(isDark) }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: gridColor(isDark) } },
      axisLabel: { color: textColor(isDark) }
    },
    series: [
      {
        name: "入库",
        type: "bar",
        barWidth: 14,
        itemStyle: { color: COLORS.primary, borderRadius: [4, 4, 0, 0] },
        data: data.map((d) => d.inboundCount)
      },
      {
        name: "出库",
        type: "bar",
        barWidth: 14,
        itemStyle: { color: COLORS.success, borderRadius: [4, 4, 0, 0] },
        data: data.map((d) => d.outboundCount)
      }
    ],
    animationDuration: 600
  };
}

/** 双折线图 — 近 12 月月度趋势 */
export function getLineOption(
  data: { name: string; estimate: number; actual: number }[],
  isDark: boolean
): EChartsOption {
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg(isDark),
      borderColor: tooltipBorder(isDark),
      textStyle: { color: textColor(isDark) },
      extraCssText: "border-radius:8px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);"
    },
    legend: {
      data: ["入库", "出库"],
      textStyle: { color: textColor(isDark) },
      top: 0
    },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => d.name),
      boundaryGap: false,
      axisLine: { lineStyle: { color: gridColor(isDark) } },
      axisLabel: { color: textColor(isDark) }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: gridColor(isDark) } },
      axisLabel: { color: textColor(isDark) }
    },
    series: [
      {
        name: "入库",
        type: "line",
        smooth: true,
        symbol: "emptyCircle",
        symbolSize: 6,
        lineStyle: { color: COLORS.primary, width: 2 },
        itemStyle: { color: COLORS.primary },
        emphasis: {
          itemStyle: { color: COLORS.primary }
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? "rgba(64,158,255,.25)" : "rgba(64,158,255,.15)" },
              { offset: 1, color: "rgba(64,158,255,0)" }
            ]
          }
        },
        data: data.map((d) => d.estimate)
      },
      {
        name: "出库",
        type: "line",
        smooth: true,
        symbol: "emptyCircle",
        symbolSize: 6,
        lineStyle: { color: COLORS.success, width: 2 },
        itemStyle: { color: COLORS.success },
        emphasis: {
          itemStyle: { color: COLORS.success }
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? "rgba(103,194,58,.25)" : "rgba(103,194,58,.15)" },
              { offset: 1, color: "rgba(103,194,58,0)" }
            ]
          }
        },
        data: data.map((d) => d.actual)
      }
    ],
    animationDuration: 600
  };
}

/** 雷达图 — 运营指标 personal vs team */
export function getRadarOption(
  data: {
    name: string;
    max: number;
    personal: number;
    team: number;
  }[],
  isDark: boolean
): EChartsOption {
  return {
    tooltip: {
      backgroundColor: tooltipBg(isDark),
      borderColor: tooltipBorder(isDark),
      textStyle: { color: textColor(isDark) },
      extraCssText: "border-radius:8px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);"
    },
    legend: {
      data: ["个人", "团队"],
      bottom: 0,
      textStyle: { color: textColor(isDark) }
    },
    radar: {
      center: ["50%", "45%"],
      radius: "65%",
      splitNumber: 4,
      axisLabel: { show: false },
      indicator: data.map((d) => {
        let max = d.max;
        if (max <= 0) max = 1;
        else if (max <= 4) max = 5;
        else if (max <= 9) max = 10;
        else if (max <= 16) max = 20;
        else if (max <= 25) max = 30;
        else if (max <= 45) max = 50;
        else max = Math.ceil(max / 20) * 20;
        return { name: d.name, max };
      }),
      axisName: { color: textColor(isDark) },
      splitArea: {
        areaStyle: {
          color: isDark
            ? ["rgba(255,255,255,.02)", "rgba(255,255,255,.05)"]
            : ["rgba(0,0,0,.02)", "rgba(0,0,0,.04)"]
        }
      },
      splitLine: { lineStyle: { color: gridColor(isDark) } },
      axisLine: { lineStyle: { color: gridColor(isDark) } }
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: data.map((d) => d.personal),
            name: "个人",
            lineStyle: { color: COLORS.primary },
            areaStyle: { color: isDark ? "rgba(64,158,255,.25)" : "rgba(64,158,255,.12)" },
            itemStyle: { color: COLORS.primary },
            symbol: "circle",
            symbolSize: 5
          },
          {
            value: data.map((d) => d.team),
            name: "团队",
            lineStyle: { color: COLORS.success },
            areaStyle: { color: isDark ? "rgba(103,194,58,.25)" : "rgba(103,194,58,.12)" },
            itemStyle: { color: COLORS.success },
            symbol: "circle",
            symbolSize: 5
          }
        ]
      }
    ],
    animationDuration: 600
  };
}
