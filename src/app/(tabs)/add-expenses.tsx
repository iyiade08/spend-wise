import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { ID } from "react-native-appwrite";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import {
  DATABASE_ID,
  databases,
  GENERAL_EXPENSES_TABLE_ID,
} from "../../../lib/appwrite";
import { useAuth } from "../../../lib/auth-context";
const addExpensesPage = () => {
  const Categories = [
    {
      label: "Food",
      icon: "hamburger",
    },
    {
      label: "Transport",
      icon: "bus",
    },

    {
      label: "Shoppping",
      icon: "shopping",
    },
    {
      label: "Bills",
      icon: "lightbulb-outline",
    },
    {
      label: "Other",
      icon: "package-variant",
    },
  ] as const;
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("Food");
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [date, setDate] = useState(new Date());
  const [title, setTitle] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pressed, setPressed] = useState<boolean>(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) setDate(selected);
  };
  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory("Food");
    setNotes("");
  };
  const formattedDate = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleSubmitExpenses = async () => {
    if (!user) return;
    if (!title) {
      setError("title is required");
      return;
    }
    if (!title || !amount) {
      setError("please fill all fields");
      return;
    }
    const value = parseFloat(amount);
    if (isNaN(value)) {
      setError("please input a real value");
      return;
    }
    try {
      const res = await databases.createDocument(
        DATABASE_ID,
        GENERAL_EXPENSES_TABLE_ID,
        ID.unique(),
        {
          user_id: user.$id,
          title,
          amount: value,
          category,
          notes,
          date: date.toISOString(),
        },
      );
      console.log(res);
      resetForm();
      router.back();
    } catch (err) {
      console.log(err, "error submitting data please try again");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            mode="outlined"
            autoCapitalize="none"
            underlineColorAndroid="transparent"
            outlineStyle={styles.inputOutline}
            placeholder="e.g Lunch with the team"
            value={title}
            onChangeText={setTitle}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            autoCapitalize="none"
            underlineColorAndroid="transparent"
            outlineStyle={styles.inputOutline}
            placeholder="$0.00"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.enquiry}>How much did you spend?</Text>
        </View>
      </View>
      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
      <View style={styles.category}>
        <Text style={styles.categoryTitle}>Category</Text>
        <View style={styles.chips}>
          {Categories.map((c) => {
            const active = category === c.label;
            return (
              <Pressable
                key={c.label}
                onPress={() => setCategory(c.label)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <MaterialCommunityIcons
                  name={c.icon}
                  size={18}
                  color={active ? "#fff" : "#475569"}
                />
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Add a note"
            outlineStyle={styles.noteOutline}
            style={styles.noteInput}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <Pressable
            style={styles.dateField}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateField}>{formattedDate}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={23}
              color={"#64748b"}
            />
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}
        </View>
      </View>
      <Button
        disabled={!title || !amount}
        mode="contained"
        style={styles.btn}
        onPress={handleSubmitExpenses}
        buttonColor={pressed ? "#8aa9f0" : "cornflowerblue"}
        onPressIn={() => setPressed(true)}
      >
        Add Expenses
      </Button>
      <Text style={styles.expText}>
        Add a title and amount to save this expenses
      </Text>
    </KeyboardAvoidingView>
  );
};

export default addExpensesPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    gap: 10,
    padding: 16,
  },
  form: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  field: {
    flexDirection: "column",
    gap: 6,
  },
  label: {
    textTransform: "capitalize",
    fontSize: 16,
    fontWeight: "400",
  },
  inputOutline: {
    borderRadius: 20,
  },
  enquiry: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "capitalize",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#eceef2",
  },
  chipActive: {
    backgroundColor: "#f97316",
  },
  chipText: {
    fontSize: 14,
    color: "#475569",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  category: {
    gap: 4,
  },
  categoryTitle: {
    color: "#111827",
  },
  noteOutline: {
    borderRadius: 16,
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#fffbfe",
  },
  dateText: {
    fontSize: 16,
  },
  btn: {
    width: "100%",
    backgroundColor: "cornflowerblue",
    color: "#FFF",
  },
  expText: {
    fontSize: 10,
    color: "#6b7280",
    alignSelf: "center",
    textTransform: "capitalize",
  },
});
