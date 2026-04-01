import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  bar_staff: "Bar Staff",
  kitchen_staff: "Kitchen Staff",
};

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name ?? "—"}</Text>
        <Text style={styles.userEmail}>{user?.email ?? "—"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "—"}
          </Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#E53935" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
    gap: 16,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8B6914",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  userEmail: {
    fontSize: 14,
    color: "#888",
  },
  roleBadge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6914",
    letterSpacing: 0.3,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
  },
  infoValue: {
    fontSize: 14,
    color: "#888",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E53935",
  },
});
