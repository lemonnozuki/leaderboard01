module.exports = {
  board_created: (e, name) => `${e.success} Bảng xếp hạng **${name}** đã được tạo`,
  board_exists: (e, name) => `${e.error} Bảng xếp hạng **${name}** đã tồn tại`,
  board_deleted: (e, name) => `${e.remove} Đã xoá bảng xếp hạng **${name}**`,
  board_not_found: (e, name) => `${e.error} Không tìm thấy bảng xếp hạng **${name}**`,
  board_empty: (e, name) => `${e.board} Bảng xếp hạng **${name}** chưa có ai`,
  board_no_list: (e) => `${e.list} Server chưa có bảng xếp hạng nào`,
  board_name_too_long: (e) => `${e.error} Tên bảng xếp hạng tối đa 32 ký tự`,
  board_delete_no_perm: (e) => `${e.error} Chỉ người tạo hoặc admin mới có thể xoá bảng xếp hạng này`,

  score_added: (e, amount, user, name, score, rank) =>
    `${e.add} Đã cộng **${amount}** điểm cho ${user} trong **${name}**\n${e.score} Điểm hiện tại: \`${score}\` ${e.rank} Hạng: **#${rank}**`,
  score_set: (e, user, score, name, rank) =>
    `${e.success} Đã đặt điểm của ${user} thành \`${score}\` trong **${name}** ${e.rank} Hạng: **#${rank}**`,
  score_removed: (e, user, name) => `${e.remove} Đã xoá ${user} khỏi bảng xếp hạng **${name}**`,
  score_no_entry: (e, user, name) => `${e.error} ${user} chưa có điểm trong **${name}**`,

  rank_display: (e, user, name, rank, score) =>
    `${e.rank} **${user}** trong **${name}**: Hạng **#${rank}** với \`${score}\` điểm`,

  embed_created_title: 'Bảng xếp hạng đã được tạo',
  embed_field_name: 'Tên',
  embed_field_desc: 'Mô tả',
  embed_field_none: 'Không có',
  embed_footer_created: (tag) => `Tạo bởi ${tag}`,
  embed_list_title: 'Danh sách bảng xếp hạng',
  embed_list_footer: (n) => `${n} bảng xếp hạng`,

  lang_changed: (e, lang) => `${e.success} Đã đổi ngôn ngữ thành: **${lang}**`,
  lang_no_perm: (e) => `${e.error} Chỉ admin mới có thể đổi ngôn ngữ`,

  error_occurred: 'Có lỗi xảy ra.',
  error_contact: (owner) => `Liên hệ ${owner} và cung cấp Error ID để được hỗ trợ.`,
};