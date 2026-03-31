import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(app)");
    } catch (err: any) {
      const message =
        err.response?.data?.error || "Login failed. Check your credentials.";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Brand section */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🥐</Text>
          </View>
          <Text style={styles.title}>Lumière Pâtisserie</Text>
          <Text style={styles.subtitle}>Staff Portal</Text>
        </View>

        {/* Form section */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputPassword]}
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={18}
                color="#aaa"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.buttonRow}>
                <Ionicons name="reload-outline" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Signing in…</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Lumière Pâtisserie · Staff Only</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  brand: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: "#FDF6E3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0DBA0",
    shadowColor: "#8B6914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 38,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.3,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 15,
    color: "#8B6914",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  form: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    gap: 14,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    paddingVertical: 0,
  },
  inputPassword: {
    paddingRight: 8,
  },
  eyeBtn: {
    padding: 2,
    flexShrink: 0,
  },
  button: {
    height: 52,
    backgroundColor: "#8B6914",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#8B6914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonIcon: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    paddingBottom: 28,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#ccc",
    letterSpacing: 0.3,
  },
});
