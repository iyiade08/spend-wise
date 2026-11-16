import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { AuthProvider, useAuth } from "../../lib/auth-context";

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isAuthScreen = segments[0] === "auth";

    if (!user && !isAuthScreen) {
      router.replace("/auth");
    } else if (user && isAuthScreen) {
      router.replace("/");
    }
  }, [user, segments, loading]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PaperProvider>
          <RouteGuard>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth"
                options={{ title: "Auth", headerShown: false }}
              />
            </Stack>
          </RouteGuard>
        </PaperProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
