import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  roles: string[];
}

const TABS: TabConfig[] = [
  {
    name: "channels",
    title: "Channels",
    icon: "chatbubbles-outline",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
  {
    name: "orders",
    title: "Orders",
    icon: "receipt-outline",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
  {
    name: "calendar",
    title: "Calendar",
    icon: "calendar-outline",
    roles: ["owner", "bar_staff"],
  },
  {
    name: "inventory",
    title: "Inventory",
    icon: "cube-outline",
    roles: ["owner", "bar_staff", "kitchen_staff"],
  },
];

export default function AppLayout() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1a1a1a",
        tabBarActiveTintColor: "#8B6914",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#eee" },
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
