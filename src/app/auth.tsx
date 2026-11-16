import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "../../lib/auth-context";

const Auth = () => {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password cannot be less than 6 characters");
      return;
    }

    setError(null);

    const result =
      mode === "signup"
        ? await signUp(email, password)
        : await signIn(email, password);

    if (result) {
      setError(result);
      return;
    }

    router.replace("/");
  };

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.wallet}>
          <MaterialCommunityIcons
            name="wallet-outline"
            size={30}
            color="#fff"
          />
        </View>
        <Text style={styles.title}>SpendWise</Text>
        <Text style={styles.subtitle}>spend smart stress less</Text>
      </View>

      <View style={styles.toggle}>
        <Pressable
          style={[styles.tab, mode === "login" && styles.tabActive]}
          onPress={() => switchMode("login")}
        >
          <Text
            style={[styles.tabText, mode === "login" && styles.tabTextActive]}
          >
            Login
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "signup" && styles.tabActive]}
          onPress={() => switchMode("signup")}
        >
          <Text
            style={[styles.tabText, mode === "signup" && styles.tabTextActive]}
          >
            Sign up
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            underlineColorAndroid="transparent"
            outlineStyle={styles.inputOutline}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            mode="outlined"
            secureTextEntry
            autoCapitalize="none"
            underlineColorAndroid="transparent"
            outlineStyle={styles.inputOutline}
            value={password}
            onChangeText={setPassword}
            placeholder="*********"
          />
        </View>
      </View>

      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

      <Button
        mode="contained"
        style={styles.btn}
        labelStyle={styles.btnText}
        onPress={handleAuth}
      >
        {mode === "login" ? "Login" : "Sign up"}
      </Button>

      <Text>Forgot password?</Text>
    </KeyboardAvoidingView>
  );
};

export default Auth;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    flexDirection: "column",
    gap: 16,
  },
  header: {
    flexDirection: "column",
    gap: 2,
    alignItems: "center",
    marginBottom: 4,
  },
  wallet: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6f9bea",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6f9bea",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6, // Android
  },
  title: {
    fontWeight: "700",
    fontSize: 24,
    textTransform: "capitalize",
    color: "#0f172a",
    letterSpacing: 1,
  },
  subtitle: {
    fontWeight: "400",
    fontSize: 16,
    textTransform: "lowercase",
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
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#111827",
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
    borderRadius: 999,
  },
  btn: {
    backgroundColor: "cornflowerblue",
    width: "100%",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
  },
});
