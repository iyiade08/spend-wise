import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Query } from "react-native-appwrite";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  DATABASE_ID,
  databases,
  GENERAL_EXPENSES_TABLE_ID,
} from "../../../lib/appwrite";
import { useAuth } from "../../../lib/auth-context";
import { Expenses } from "../../../types/database.types";

type Mode = "weekly" | "monthly";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59a2b",
  Bills: "#8b45d6",
  Transport: "#3b82f6",
  Shopping: "#ec4899",
  Other: "#6b7280",
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RANK_COLORS = ["#e8b73e", "#9ca3af", "#b9784b"];

const SIZE = 150;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const BAR_MAX = 100;

const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const moneyRound = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

// uses the picked date, and falls back to when the row was created
const getExpenseDate = (e: Expenses) => e.date || e.$createdAt;

// only reviewed expenses count toward the stats
const countsTowardStats = (e: Expenses) => !!e.last_reviewed_at;

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// weeks start on Monday
const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
};

const Stats = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("weekly");
  const [expenses, setExpenses] = useState<Expenses[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadExpenses = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        GENERAL_EXPENSES_TABLE_ID,
        [Query.equal("user_id", user.$id)],
      );
      setExpenses(res.documents as unknown as Expenses[]);
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [user]),
  );

  // ---- period ranges ----
  const now = new Date();
  const isWeekly = mode === "weekly";
  const periodWord = isWeekly ? "week" : "month";

  const start = isWeekly
    ? startOfWeek(now)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = isWeekly
    ? addDays(start, 7)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevStart = isWeekly
    ? addDays(start, -7)
    : new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const inRange = (e: Expenses, from: Date, to: Date) => {
    const t = new Date(getExpenseDate(e)).getTime();
    return t >= from.getTime() && t < to.getTime();
  };

  const counted = expenses.filter(countsTowardStats);
  const current = counted.filter((e) => inRange(e, start, end));
  const previous = counted.filter((e) => inRange(e, prevStart, start));

  const sum = (list: Expenses[]) =>
    list.reduce((total, e) => total + Number(e.amount), 0);
  const total = sum(current);
  const prevTotal = sum(previous);
  const diff =
    prevTotal === 0
      ? null
      : Math.round(((total - prevTotal) / prevTotal) * 100);

  // ---- spending by category ----
  const byCategory: Record<string, number> = {};
  current.forEach((e) => {
    const key = CATEGORY_COLORS[e.category] ? e.category : "Other";
    byCategory[key] = (byCategory[key] ?? 0) + Number(e.amount);
  });
  const segments = Object.entries(byCategory)
    .map(([name, amount]) => ({
      name,
      amount,
      color: CATEGORY_COLORS[name],
    }))
    .sort((a, b) => b.amount - a.amount);

  let runningOffset = 0;
  const arcs = segments.map((s) => {
    const len = (s.amount / total) * CIRC;
    const arc = { color: s.color, len, offset: runningOffset };
    runningOffset += len;
    return arc;
  });
  const gap = arcs.length > 1 ? 2 : 0;

  // ---- top 3 biggest expenses ----
  const top3 = [...current]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 3);

  // ---- spending per day ----
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const todayIndex = isWeekly ? (now.getDay() + 6) % 7 : now.getDate() - 1;
  const bars = isWeekly
    ? DAY_LABELS.map((label) => ({ label, value: 0 }))
    : Array.from({ length: daysInMonth }, (_, i) => ({
        label: String(i + 1),
        value: 0,
      }));
  current.forEach((e) => {
    const d = new Date(getExpenseDate(e));
    const index = isWeekly ? (d.getDay() + 6) % 7 : d.getDate() - 1;
    if (bars[index]) bars[index].value += Number(e.amount);
  });
  const maxBar = Math.max(...bars.map((b) => b.value), 0);

  const showLabel = (index: number) =>
    isWeekly || index === 0 || (index + 1) % 5 === 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadExpenses} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Spending Stats</Text>
          <Text style={styles.subTitle}>Where your money went</Text>
        </View>

        <View style={styles.toggle}>
          <Pressable
            onPress={() => setMode("weekly")}
            style={[styles.tab, mode === "weekly" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                mode === "weekly" && styles.activeTabText,
              ]}
            >
              Week
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("monthly")}
            style={[styles.tab, mode === "monthly" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                mode === "monthly" && styles.activeTabText,
              ]}
            >
              Month
            </Text>
          </Pressable>
        </View>

        {/* total */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>Total spent this {periodWord}</Text>
            <Text style={styles.amount}>${money(total)}</Text>
            {diff !== null && (
              <View
                style={[
                  styles.pill,
                  diff <= 0 ? styles.pillGood : styles.pillBad,
                ]}
              >
                <MaterialCommunityIcons
                  name={diff <= 0 ? "arrow-down" : "arrow-up"}
                  size={14}
                  color={diff <= 0 ? "#16a34a" : "#dc2626"}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: diff <= 0 ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {Math.abs(diff)}% {diff <= 0 ? "less" : "more"} than last{" "}
                  {periodWord}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* spending by category */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>SPENDING BY CATEGORY</Text>

            <View style={styles.donutWrap}>
              <Svg width={SIZE} height={SIZE}>
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke="#eef0f4"
                  strokeWidth={STROKE}
                  fill="none"
                />
                {total > 0 &&
                  arcs.map((arc, i) => (
                    <Circle
                      key={i}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      stroke={arc.color}
                      strokeWidth={STROKE}
                      fill="none"
                      strokeDasharray={`${Math.max(arc.len - gap, 0)} ${CIRC}`}
                      strokeDashoffset={-arc.offset}
                      rotation={-90}
                      origin={`${SIZE / 2}, ${SIZE / 2}`}
                    />
                  ))}
              </Svg>
              <View style={styles.donutCenter}>
                <Text style={styles.donutAmount}>${moneyRound(total)}</Text>
                <Text style={styles.donutLabel}>this {periodWord}</Text>
              </View>
            </View>

            {segments.length === 0 ? (
              <Text style={styles.emptyText}>
                No reviewed expenses this {periodWord} yet
              </Text>
            ) : (
              segments.map((s) => (
                <View key={s.name} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={styles.legendName}>{s.name}</Text>
                  <Text style={styles.legendAmount}>${money(s.amount)}</Text>
                  <Text style={styles.legendPercent}>
                    {Math.round((s.amount / total) * 100)}%
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* top 3 biggest expenses */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>TOP 3 BIGGEST EXPENSES</Text>

            {top3.length === 0 ? (
              <Text style={styles.emptyText}>
                No reviewed expenses this {periodWord} yet
              </Text>
            ) : (
              top3.map((e, i) => (
                <View
                  key={e.$id}
                  style={[
                    styles.rankRow,
                    i < top3.length - 1 && styles.rankBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: RANK_COLORS[i] },
                    ]}
                  >
                    <Text style={styles.rankBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.rankTitle} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <Text style={styles.rankAmount}>
                    ${money(Number(e.amount))}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* spending per day */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>SPENDING PER DAY</Text>

            <View style={[styles.bars, { gap: isWeekly ? 8 : 2 }]}>
              {bars.map((b, i) => {
                const height =
                  maxBar === 0
                    ? 4
                    : Math.max(
                        (b.value / maxBar) * BAR_MAX,
                        b.value > 0 ? 6 : 3,
                      );
                return (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height,
                          backgroundColor:
                            i === todayIndex ? "#5b8def" : "#c7d7f9",
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>
                      {showLabel(i) ? b.label : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Stats;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  header: {
    gap: 2,
  },
  title: {
    fontWeight: "700",
    fontSize: 24,
    color: "#111827",
  },
  subTitle: {
    fontSize: 12,
    color: "#64748b",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#eceef2",
    borderRadius: 999,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#6b7280",
  },
  activeTabText: {
    color: "#111827",
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#64748b",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#6b7280",
  },
  amount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    marginVertical: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillGood: { backgroundColor: "#d8f3e0" },
  pillBad: { backgroundColor: "#fee2e2" },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  donutWrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
  },
  donutAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  donutLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  legendName: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginRight: 12,
  },
  legendPercent: {
    width: 34,
    textAlign: "right",
    fontSize: 11,
    color: "#94a3b8",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 8,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rankBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f4",
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  rankTitle: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  rankAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_MAX + 22,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 6,
  },
  barLabel: {
    height: 16,
    marginTop: 6,
    width: 28,
    textAlign: "center",
    fontSize: 10,
    color: "#94a3b8",
  },
});
