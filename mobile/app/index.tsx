import { Redirect } from "expo-router";
import { useState } from "react";

import { SplashScreen } from "@/components/SplashScreen";
import { useAuthStore } from "@/store/authStore";

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [splashDone, setSplashDone] = useState(false);

  if (!isHydrated || !splashDone) {
    return (
      <SplashScreen
        durationMs={isHydrated && accessToken ? 1800 : 2800}
        onFinish={() => setSplashDone(true)}
      />
    );
  }

  if (accessToken) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
