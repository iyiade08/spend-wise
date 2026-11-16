import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ID, Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DATABASE_ID,
  databases,
  GENERAL_EXPENSES_TABLE_ID,
  REVIEWED_EXPENSES_TABLE_ID,
} from "../../../lib/appwrite";
import { useAuth } from "../../../lib/auth-context";
import { Expenses } from "../../../types/database.types";

const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// uses the picked date, and falls back to when the row was created
const getExpenseDate = (e: Expenses) => e.date || e.$createdAt;

const isCompletedToday = (e: Expenses) =>
  !!e.last_reviewed_at && isSameDay(new Date(e.last_reviewed_at), new Date());

const isReviewed = (e: Expenses) => !!e.last_reviewed_at;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const getSection = (iso: string) => {
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  return "Earlier";
};

const getDateLabel = (iso: string) => {
  const section = getSection(iso);
  if (section === "Today" || section === "Yesterday") return section;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const categoryIcons = {
  Food: "hamburger",
  Transport: "bus",
  Shopping: "shopping",
  Bills: "lightbulb-outline",
  Other: "package-variant",
} as const;

export default function Index() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const { user, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expenses, setExpenses] = useState<Expenses[]>([]);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

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

  const handleDeleteExpenses = async (id: string) => {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        GENERAL_EXPENSES_TABLE_ID,
        id,
      );
      setExpenses((prev) => prev.filter((e) => e.$id !== id));
    } catch (error) {
      console.log(error);
    }
  };

  const handleReviewedExpenses = async (id: string) => {
    const expense = expenses.find((e) => e.$id === id);
    if (!user || !expense || isCompletedToday(expense)) return;

    const currentDate = new Date().toISOString();
    const previous = expense.last_reviewed_at;

    // 1. show the faded card + badge straight away
    setExpenses((prev) =>
      prev.map((e) =>
        e.$id === id ? { ...e, last_reviewed_at: currentDate } : e,
      ),
    );

    // 2. save it, and undo the change if saving fails
    try {
      await databases.updateDocument(
        DATABASE_ID,
        GENERAL_EXPENSES_TABLE_ID,
        id,
        { last_reviewed_at: currentDate },
      );
    } catch (error) {
      console.log("update failed:", error);
      Alert.alert(
        "Could not mark as reviewed",
        error instanceof Error ? error.message : "Unknown error",
      );
      setExpenses((prev) =>
        prev.map((e) =>
          e.$id === id ? { ...e, last_reviewed_at: previous } : e,
        ),
      );
      return;
    }

    // the history row is a separate step, so a failure here keeps the badge
    try {
      await databases.createDocument(
        DATABASE_ID,
        REVIEWED_EXPENSES_TABLE_ID,
        ID.unique(),
        {
          user_id: user.$id,
          expense_id: id,
          title: expense.title,
          completed_at: currentDate,
        },
      );
    } catch (error) {
      console.log("history row failed:", error);
      Alert.alert(
        "Reviewed, but history not saved",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  // ---- month totals for the gradient card ----
  const now = new Date();
  const inMonth = (iso: string, monthsAgo: number) => {
    const d = new Date(iso);
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return (
      d.getFullYear() === target.getFullYear() &&
      d.getMonth() === target.getMonth()
    );
  };

  const monthTotal = expenses
    .filter((e) => isReviewed(e) && inMonth(getExpenseDate(e), 0))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const lastMonthTotal = expenses
    .filter((e) => isReviewed(e) && inMonth(getExpenseDate(e), 1))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const diff =
    lastMonthTotal === 0
      ? null
      : Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100);

  // ---- group expenses into sections ----
  const sorted = [...expenses].sort(
    (a, b) =>
      new Date(getExpenseDate(b)).getTime() -
      new Date(getExpenseDate(a)).getTime(),
  );
  const sections = ["Today", "Yesterday", "Earlier this week", "Earlier"]
    .map((title) => ({
      title,
      items: sorted.filter((e) => getSection(getExpenseDate(e)) === title),
    }))
    .filter((s) => s.items.length > 0);

  const renderLeftActions = () => (
    <View style={[styles.action, styles.completeAction]}>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={32}
        color="#fff"
      />
    </View>
  );

  const renderRightActions = () => (
    <View style={[styles.action, styles.deleteAction]}>
      <MaterialCommunityIcons name="trash-can-outline" size={32} color="#fff" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Expenses</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <Pressable onPress={() => signOut()}>
          <Text style={styles.signoutBtn}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.refreshView}>
        <MaterialCommunityIcons name="refresh" size={18} color="#64748b" />
        <Text style={styles.refreshText}>Pull down to refresh</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadExpenses} />
        }
      >
        <LinearGradient
          colors={["#7ba2f0", "#5b8def"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summary}
        >
          <Text style={styles.summaryLabel}>Spent this month</Text>
          <Text style={styles.summaryAmount}>${money(monthTotal)}</Text>
          {diff !== null && (
            <View style={styles.summaryPill}>
              <MaterialCommunityIcons
                name={diff <= 0 ? "arrow-down" : "arrow-up"}
                size={14}
                color="#fff"
              />
              <Text style={styles.summaryPillText}>
                {Math.abs(diff)}% {diff <= 0 ? "less" : "more"} than last month
              </Text>
            </View>
          )}
        </LinearGradient>

        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No expenses recorded yet</Text>
          </View>
        ) : (
          sections.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{s.title.toUpperCase()}</Text>

              {s.items.map((e) => {
                const done = isCompletedToday(e);

                return (
                  <View key={e.$id} style={styles.cardWrapper}>
                    <Swipeable
                      ref={(ref) => {
                        swipeableRefs.current[e.$id] = ref;
                      }}
                      overshootLeft={false}
                      overshootRight={false}
                      friction={2}
                      leftThreshold={60}
                      rightThreshold={60}
                      renderLeftActions={renderLeftActions}
                      renderRightActions={renderRightActions}
                      containerStyle={styles.swipeable}
                      onSwipeableLeftOpen={() => {
                        handleReviewedExpenses(e.$id);
                        swipeableRefs.current[e.$id]?.close();
                      }}
                      onSwipeableRightOpen={() => {
                        handleDeleteExpenses(e.$id);
                        swipeableRefs.current[e.$id]?.close();
                      }}
                    >
                      <View style={styles.card}>
                        <View style={[styles.iconCircle, done && styles.faded]}>
                          <MaterialCommunityIcons
                            name={
                              categoryIcons[
                                e.category as keyof typeof categoryIcons
                              ] ?? "package-variant"
                            }
                            size={20}
                            color="#f97316"
                          />
                        </View>

                        <View style={styles.cardInfo}>
                          <View style={styles.titleRow}>
                            <Text
                              style={[styles.cardTitle, done && styles.faded]}
                            >
                              {e.title}
                            </Text>
                            {done && (
                              <View style={styles.badge}>
                                <MaterialCommunityIcons
                                  name="check"
                                  size={9}
                                  color="#16a34a"
                                />
                                <Text style={styles.badgeText}>Reviewed</Text>
                              </View>
                            )}
                          </View>
                          {!!e.notes && (
                            <Text
                              style={[
                                styles.cardCategory,
                                done && styles.faded,
                              ]}
                            >
                              {e.notes}
                            </Text>
                          )}
                        </View>

                        <View style={[styles.cardRight, done && styles.faded]}>
                          <Text style={styles.cardAmount}>
                            ${money(Number(e.amount))}
                          </Text>
                          <Text style={styles.cardDate}>
                            {getDateLabel(getExpenseDate(e))}
                          </Text>
                        </View>
                      </View>
                    </Swipeable>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    textTransform: "capitalize",
    fontWeight: "500",
    fontSize: 20,
    color: "#111827",
  },
  signoutBtn: {
    fontSize: 14,
    color: "#64748b",
  },
  date: {
    fontWeight: "400",
    fontSize: 12,
    color: "#475569",
  },
  refreshView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 999,
  },
  refreshText: {
    fontSize: 14,
    color: "#475569",
  },
  summary: {
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  summaryPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  summaryPillText: {
    fontSize: 12,
    color: "#fff",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#64748b",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    color: "#64748b",
  },
  cardWrapper: {
    marginBottom: 2,
  },
  swipeable: {
    borderRadius: 16,
  },
  action: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  completeAction: {
    backgroundColor: "#22c55e",
    alignItems: "flex-start",
  },
  deleteAction: {
    backgroundColor: "#ef4444",
    alignItems: "flex-end",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  faded: {
    opacity: 0.45,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  cardCategory: {
    fontSize: 12,
    color: "#64748b",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#16a34a",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
});
