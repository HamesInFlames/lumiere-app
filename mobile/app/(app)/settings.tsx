import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  bar_staff: "Bar Staff",
  kitchen_staff: "Kitchen Staff",
};

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put("/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert("Success", "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update password.";
      Alert.alert("Error", msg);
    } finally {
      setPasswordLoading(false);
    }
  };

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

      {/* Change Password */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.infoRow}
          activeOpacity={0.7}
          onPress={() => setPasswordOpen((prev) => !prev)}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Change Password</Text>
          <Ionicons
            name={passwordOpen ? "chevron-up" : "chevron-forward"}
            size={18}
            color="#888"
          />
        </TouchableOpacity>

        {passwordOpen && (
          <View style={styles.passwordForm}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Current Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="New Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm New Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[
                styles.updatePasswordButton,
                passwordLoading && { opacity: 0.7 },
              ]}
              onPress={handleChangePassword}
              activeOpacity={0.8}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.updatePasswordText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  passwordForm: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  passwordInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#1a1a1a",
  },
  updatePasswordButton: {
    backgroundColor: "#8B6914",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  updatePasswordText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
