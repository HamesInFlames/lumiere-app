import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  activeIcon: IconName;
  roles: string[];
}

const TABS: TabConfig[] = [
  {
    name: "channels",
    title: "Channels",
    icon: "chatbubbles-outline",
    activeIcon: "chatbubbles",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
  {
    name: "orders",
    title: "Orders",
    icon: "receipt-outline",
    activeIcon: "receipt",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
  {
    name: "calendar/index",
    title: "Calendar",
    icon: "calendar-outline",
    activeIcon: "calendar",
    roles: ["owner", "bar_staff"],
  },
  {
    name: "inventory/index",
    title: "Inventory",
    icon: "cube-outline",
    activeIcon: "cube",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
  {
    name: "recipes",
    title: "Recipes",
    icon: "book-outline",
    activeIcon: "book",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
];

function SettingsButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/settings")}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ paddingRight: 4 }}
    >
      <Ionicons name="person-circle-outline" size={26} color="#8B6914" />
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const role = useAuthStore((s) => s.user?.role);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 8);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fff",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#f0f0f0",
        } as any,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: "700",
          color: "#1a1a1a",
        },
        headerRight: () => <SettingsButton />,
        headerTintColor: "#8B6914",
        tabBarActiveTintColor: "#8B6914",
        tabBarInactiveTintColor: "#bbb",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f0f0f0",
          borderTopWidth: 1,
          height: 54 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: tab.name !== "channels",
            href: role && tab.roles.includes(role) ? undefined : null,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          href: null,
          headerRight: undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
