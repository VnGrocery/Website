export const shopStatuses = ["active", "pending", "flagged", "suspended", "archived"];
export const productStatuses = ["active", "draft", "flagged", "suspended", "archived"];
export const userRoles = ["buyer", "seller", "admin"];
export const userStatuses = ["active", "pending", "suspended", "disabled"];
export const buyerCheckStatuses = ["completed", "flagged", "rejected"];
export const reportStatuses = ["active", "flagged", "rejected"];

const labels = {
  active: "Hoạt động",
  pending: "Chờ duyệt",
  flagged: "Bị gắn cờ",
  suspended: "Tạm khóa",
  archived: "Lưu trữ",
  draft: "Bản nháp",
  disabled: "Vô hiệu",
  completed: "Hoàn tất",
  rejected: "Từ chối",
  revoked: "Thu hồi",
  verified: "Đã xác thực",
  trusted: "Đáng tin",
  buyer: "Người mua",
  seller: "Người bán",
  admin: "Quản trị viên",
  rotate: "Xoay",
  recover: "Khôi phục",
  backfill: "Bổ sung",
  true: "Đúng",
  false: "Sai",
};

export function labelOf(value) {
  if (value === undefined || value === null || value === "") {
    return "Tất cả";
  }
  return labels[String(value)] || String(value);
}
