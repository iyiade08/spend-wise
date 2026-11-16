import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "cornflowerblue",
        tabBarInactiveTintColor: "#666",
        headerShadowVisible: false,
        headerTitleAlign: "center",
        tabBarStyle: {
          backgroundColor: "#f5f5f5",
          borderTopWidth: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Expenses",
          headerShown: false,
          tabBarIcon: ({ size, color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "currency-usd" : "currency-usd-off"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add-expenses"
        options={{
          title: "Add-Expenses",
          tabBarIcon: ({ size, color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "plus-circle" : "plus-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          headerShown: false,
          tabBarIcon: ({ size, color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "chart-bar" : "chart-bar"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
