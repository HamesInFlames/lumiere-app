import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

interface OrderItem {
  id: string;
  quantity: number;
  product_name: string;
  kitchen?: string;
  notes?: string;
  unit_price?: number;
}

interface OrderAttachment {
  id: string;
  image_url: string;
  uploaded_by?: string;
  note?: string;
  created_at?: string;
}

interface OrderDetail {
  id: string;
  type: "preorder" | "wholesale";
  status: string;
  created_by?: string;
  created_at?: string;
  customer_name?: string;
  wholesale_code?: string;
  phone_number?: string;
  pickup_date?: string;
  pickup_time?: string;
  due_date?: string;
  due_time_context?: string;
  payment_status?: string;
  notes?: string;
  items: OrderItem[];
  attachments?: OrderAttachment[];
  edited?: boolean;
  last_edited_by?: string;
  last_edited_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#FF7043",
  confirmed: "#1976D2",
  in_preparation: "#7B1FA2",
  prepared: "#2E7D32",
  picked_up: "#43A047",
  no_show: "#F57C00",
  cancelled: "#9E9E9E",
};

const STATUS_LABELS: Record<string, string> = {
  new: "NEW",
  confirmed: "CONFIRMED",
  in_preparation: "IN PREP",
  prepared: "READY",
  picked_up: "PICKED UP",
  no_show: "NO SHOW",
  cancelled: "CANCELLED",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ActionConfig {
  label: string;
  status: string;
  style: "primary" | "danger" | "warning";
}

function getActions(role: string, status: string): ActionConfig[] {
  const actions: ActionConfig[] = [];
  const isBarOrOwner = role === "bar_staff" || role === "owner";
  const isKitchenOrOwner = role === "kitchen_staff" || role === "owner";

  if (isBarOrOwner && status === "new") {
    actions.push({ label: "Confirm", status: "confirmed", style: "primary" });
  }
  if (isKitchenOrOwner && status === "confirmed") {
    actions.push({
      label: "Mark In Preparation",
      status: "in_preparation",
      style: "primary",
    });
  }
  if (isKitchenOrOwner && status === "in_preparation") {
    actions.push({
      label: "Mark Prepared",
      status: "prepared",
      style: "primary",
    });
  }
  if (isBarOrOwner && status === "prepared") {
    actions.push({
      label: "Mark Picked Up",
      status: "picked_up",
      style: "primary",
    });
  }
  if (
    isBarOrOwner &&
    ["confirmed", "in_preparation", "prepared"].includes(status)
  ) {
    actions.push({
      label: "Mark No Show",
      status: "no_show",
      style: "warning",
    });
  }
  if (isBarOrOwner && !["picked_up", "no_show", "cancelled"].includes(status)) {
    actions.push({
      label: "Cancel Order",
      status: "cancelled",
      style: "danger",
    });
  }

  return actions;
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    const { data } = await api.get<OrderDetail>(`/api/orders/${id}`);
    setOrder(data);
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await fetchOrder();
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Failed to load order";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchOrder]);

  const handleStatusChange = useCallback(
    async (newStatus: string, label: string) => {
      Alert.alert(
        label,
        `Change order status to "${newStatus.replace(/_/g, " ")}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            style: newStatus === "cancelled" ? "destructive" : "default",
            onPress: async () => {
              setActionLoading(newStatus);
              try {
                await api.patch(`/api/orders/${id}/status`, {
                  status: newStatus,
                });
                await fetchOrder();
              } catch (err: unknown) {
                Alert.alert(
                  "Error",
                  (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Failed to update status"
                );
              } finally {
                setActionLoading(null);
              }
            },
          },
        ]
      );
    },
    [id, fetchOrder]
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Order",
      "Are you sure you want to delete this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Delete",
              "This will permanently delete the order and all its items. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Permanently",
                  style: "destructive",
                  onPress: async () => {
                    setDeleteLoading(true);
                    try {
                      await api.delete(`/api/orders/${id}`);
                      router.back();
                    } catch (err: unknown) {
                      Alert.alert(
                        "Error",
                        (
                          err as {
                            response?: { data?: { message?: string } };
                          }
                        )?.response?.data?.message ?? "Failed to delete order"
                      );
                    } finally {
                      setDeleteLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [id, router]);

  const handleAttachPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photos to attach images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("image", {
      uri: asset.uri,
      type: "image/jpeg",
      name: "order-photo.jpg",
    } as unknown as Blob);

    setAttachLoading(true);
    try {
      await api.post(`/api/orders/${id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchOrder();
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to upload photo"
      );
    } finally {
      setAttachLoading(false);
    }
  }, [id, fetchOrder]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Details" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
        </View>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Details" }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "Order not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              fetchOrder()
                .catch((e: unknown) =>
                  setError(
                    (e as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message ?? "Failed to load order"
                  )
                )
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isPreorder = order.type === "preorder";
  const statusColor = STATUS_COLORS[order.status] ?? "#9E9E9E";
  const actions = getActions(role, order.status);
  const title = isPreorder
    ? (order.customer_name ?? "Pre-order")
    : (order.wholesale_code ?? "Wholesale");

  const isOwner = role === "owner";
  const isBarStaff = role === "bar_staff";
  const isKitchenStaff = role === "kitchen_staff";

  // bar_staff can edit own orders; owner can edit any
  const canEdit =
    isOwner || (isBarStaff && order.created_by === user?.id);
  const canDelete = isOwner;
  const canAttach = isOwner || isKitchenStaff;

  const attachments = order.attachments ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View style={styles.headerRight}>
              {canEdit && (
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      isPreorder
                        ? `/orders/preorder/edit?id=${id}`
                        : `/orders/wholesale/edit?id=${id}`
                    )
                  }
                  style={styles.headerBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={20} color="#8B6914" />
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.headerBtn}
                  disabled={deleteLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#E53935" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Type + Status badges */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.typeBadge,
              isPreorder ? styles.typePre : styles.typeWholesale,
            ]}
          >
            <Text
              style={[
                styles.typeText,
                isPreorder ? styles.typeTextPre : styles.typeTextWholesale,
              ]}
            >
              {isPreorder ? "PRE-ORDER" : "WHOLESALE"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>
              {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Order info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Info</Text>
          {isPreorder ? (
            <>
              <Field label="Customer" value={order.customer_name} />
              <Field label="Phone" value={order.phone_number} />
              <Field label="Pickup Date" value={formatDate(order.pickup_date)} />
              <Field label="Pickup Time" value={order.pickup_time} />
              <Field
                label="Payment"
                value={
                  order.payment_status
                    ? order.payment_status.replace(/_/g, " ").toUpperCase()
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <Field label="Wholesale Code" value={order.wholesale_code} />
              <Field label="Due Date" value={formatDate(order.due_date)} />
              <Field label="Due Time" value={order.due_time_context} />
            </>
          )}
          {order.notes ? <Field label="Notes" value={order.notes} /> : null}
          <Field label="Created" value={formatDateTime(order.created_at)} />
          {order.created_by ? (
            <Field label="Created By" value={order.created_by} />
          ) : null}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Items ({order.items?.length ?? 0})
          </Text>
          {!order.items?.length ? (
            <Text style={styles.emptyItems}>No items</Text>
          ) : (
            order.items.map((item, idx) => (
              <View
                key={item.id ?? idx}
                style={[
                  styles.itemRow,
                  idx < order.items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  {item.kitchen && (
                    <Text style={styles.itemKitchen}>
                      {item.kitchen.toUpperCase()}
                    </Text>
                  )}
                  {item.notes ? (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
              </View>
            ))
          )}
        </View>

        {/* Attachments */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>
              Photos ({attachments.length})
            </Text>
            {canAttach && (
              <TouchableOpacity
                style={styles.attachButton}
                onPress={handleAttachPhoto}
                disabled={attachLoading}
                activeOpacity={0.7}
              >
                {attachLoading ? (
                  <ActivityIndicator size="small" color="#8B6914" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color="#8B6914" />
                    <Text style={styles.attachButtonText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          {attachments.length === 0 ? (
            <Text style={styles.emptyItems}>No photos attached</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {attachments.map((att) => (
                  <View key={att.id} style={styles.photoItem}>
                    <Image
                      source={{ uri: att.image_url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    {att.uploaded_by ? (
                      <Text style={styles.photoCredit} numberOfLines={1}>
                        {att.uploaded_by}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Edited by */}
        {order.edited && (
          <View style={styles.editedBanner}>
            <Ionicons name="pencil" size={13} color="#F57F17" />
            <Text style={styles.editedText}>
              Edited by {order.last_edited_by ?? "unknown"} ·{" "}
              {formatDateTime(order.last_edited_at)}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {actions.length > 0 && (
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Actions</Text>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.status}
                style={[
                  styles.actionButton,
                  action.style === "primary" && styles.actionPrimary,
                  action.style === "warning" && styles.actionWarning,
                  action.style === "danger" && styles.actionDanger,
                  actionLoading !== null && styles.actionDisabled,
                ]}
                onPress={() => handleStatusChange(action.status, action.label)}
                disabled={actionLoading !== null}
                activeOpacity={0.75}
              >
                {actionLoading === action.status ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionText}>{action.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: "#E53935",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#8B6914",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  headerRight: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  headerBtn: {
    padding: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typePre: {
    backgroundColor: "#EDE7F6",
  },
  typeWholesale: {
    backgroundColor: "#E3F2FD",
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  typeTextPre: {
    color: "#5E35B1",
  },
  typeTextWholesale: {
    color: "#1565C0",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B6914",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8B6914",
  },
  attachButtonText: {
    fontSize: 13,
    color: "#8B6914",
    fontWeight: "600",
  },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#888",
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  emptyItems: {
    fontSize: 14,
    color: "#bbb",
    textAlign: "center",
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 8,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  itemKitchen: {
    fontSize: 11,
    color: "#1565C0",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  itemNotes: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  itemQty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B6914",
    minWidth: 32,
    textAlign: "right",
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  photoItem: {
    gap: 4,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  photoCredit: {
    fontSize: 11,
    color: "#999",
    maxWidth: 100,
  },
  editedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  editedText: {
    fontSize: 13,
    color: "#F57F17",
    flex: 1,
  },
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 10,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: {
    backgroundColor: "#8B6914",
  },
  actionWarning: {
    backgroundColor: "#F9A825",
  },
  actionDanger: {
    backgroundColor: "#E53935",
  },
  actionDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
