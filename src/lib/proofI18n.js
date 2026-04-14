function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, "");
}

const headlineMap = new Map([
  ["data mismatch detected", "Phát hiện sai lệch dữ liệu"],
  ["phat hien sai lech du lieu", "Phát hiện sai lệch dữ liệu"],
  ["pledge has been revoked", "Cam kết đã bị thu hồi"],
  ["cam ket da bi thu hoi", "Cam kết đã bị thu hồi"],
  ["pending blockchain anchoring", "Đang chờ neo lên blockchain"],
  ["dang cho neo len blockchain", "Đang chờ neo lên blockchain"],
  ["pledge verified", "Cam kết đã được xác thực"],
  ["cam ket da duoc xac thuc", "Cam kết đã được xác thực"],
  ["unable to verify yet", "Chưa xác thực được"],
  ["chua xac thuc duoc", "Chưa xác thực được"],
  ["provided hash does not match", "Hash đối chiếu không khớp"],
  ["hash doi chieu khong khop", "Hash đối chiếu không khớp"],
]);

const summaryMap = new Map([
  ["current data no longer matches the record anchored on blockchain", "Dữ liệu hiện tại không còn khớp với bản ghi đã được neo lên blockchain."],
  ["du lieu hien tai khong con khop voi ban ghi da duoc neo len blockchain", "Dữ liệu hiện tại không còn khớp với bản ghi đã được neo lên blockchain."],
  ["this record has been revoked in the integrity layer and is no longer considered a valid pledge", "Bản ghi này đã bị thu hồi ở lớp integrity và không còn được xem là cam kết hợp lệ."],
  ["ban ghi nay da bi thu hoi tren lop integrity va khong con duoc xem la cam ket hop le", "Bản ghi này đã bị thu hồi ở lớp integrity và không còn được xem là cam kết hợp lệ."],
  ["the pledge was created but hash anchoring to blockchain has not completed yet", "Cam kết đã được tạo nhưng chưa hoàn tất việc neo hash lên blockchain."],
  ["cam ket da duoc tao nhung chua hoan tat viec neo hash len blockchain", "Cam kết đã được tạo nhưng chưa hoàn tất việc neo hash lên blockchain."],
  ["the data hash in the database matches the record anchored on blockchain", "Hash dữ liệu trong cơ sở dữ liệu trùng khớp với bản ghi đã được neo lên blockchain."],
  ["hash du lieu trong co so du lieu trung khop voi ban ghi da duoc neo len blockchain", "Hash dữ liệu trong cơ sở dữ liệu trùng khớp với bản ghi đã được neo lên blockchain."],
  ["the system does not have enough information yet to conclude the integrity status of this pledge", "Hệ thống chưa có đủ thông tin để kết luận trạng thái integrity của cam kết này."],
  ["he thong chua co du thong tin de ket luan trang thai integrity cua cam ket nay", "Hệ thống chưa có đủ thông tin để kết luận trạng thái integrity của cam kết này."],
  ["provided hash does not match the current pledge record", "Hash được cung cấp không trùng với bản ghi pledge hiện tại."],
  ["hash duoc cung cap khong trung voi ban ghi pledge hien tai", "Hash được cung cấp không trùng với bản ghi pledge hiện tại."],
]);

const actionMap = new Map([
  ["show_warning", "Cảnh báo cần kiểm tra"],
  ["contact_admin", "Liên hệ quản trị viên"],
  ["consider_reanchor", "Cân nhắc ghi nhận lại"],
  ["hide_trust_badge", "Ẩn nhãn tin cậy"],
  ["show_revoked_state", "Hiển thị trạng thái đã thu hồi"],
  ["show_pending_badge", "Đang đồng bộ blockchain"],
  ["retry_later", "Thử lại sau ít giây"],
  ["show_verified_badge", "Đã xác thực on-chain"],
  ["show_neutral_state", "Chưa đủ bằng chứng on-chain, hệ thống sẽ tự kiểm tra lại"],
  ["refresh_record", "Làm mới bản ghi để đối chiếu lại"],
]);

export function localizeProofHeadline(proof) {
  const text = proof?.proofHeadline;
  const normalized = normalize(text);
  return headlineMap.get(normalized) || text || "Chưa có";
}

export function localizeProofSummary(proof) {
  const text = proof?.proofSummary;
  const normalized = normalize(text);
  return summaryMap.get(normalized) || text || "Chưa có";
}

export function localizeProofAction(action) {
  const normalized = normalize(action);
  return actionMap.get(normalized) || action || "Chưa có";
}
