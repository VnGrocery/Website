export const shopStatuses = ["active", "pending", "flagged", "suspended", "archived"];
export const productStatuses = ["active", "draft", "flagged", "suspended", "archived"];
export const userRoles = ["buyer", "seller", "admin"];
export const userStatuses = ["active", "pending", "suspended", "deleted"];
export const buyerCheckStatuses = ["completed", "flagged", "rejected"];
export const reportStatuses = ["active", "flagged", "rejected"];

const labels = {
  active: "Hoạt động",
  pending: "Chờ duyệt",
  flagged: "Cần xem lại",
  suspended: "Tạm dừng",
  deleted: "Đã xóa",
  archived: "Đã lưu",
  draft: "Chưa đăng",
  disabled: "Đã khóa",
  completed: "Đã xong",
  rejected: "Không đạt",
  revoked: "Đã hủy",
  verified: "Đạt kiểm tra",
  trusted: "Tin cậy",
  buyer: "Người mua",
  seller: "Người bán",
  admin: "Quản trị viên",
  rotate: "Đổi khóa mới",
  recover: "Khôi phục khóa",
  backfill: "Bổ sung khóa",
  reanchor: "Ghi nhận lại",
  revoke: "Hủy cam kết",
  true: "Có",
  false: "Không",
};

export function labelOf(value) {
  if (value === undefined || value === null || value === "") {
    return "Tất cả";
  }
  return labels[String(value)] || String(value);
}
