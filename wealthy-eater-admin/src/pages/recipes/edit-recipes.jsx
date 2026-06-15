// ❌ XÓA hoặc comment dòng useParams cũ:
// const { id } = useParams(); 

//  SỬA ĐẦU HÀM THÀNH NHẬN PROPS:
export default function EditRecipePage({ id, onClose, onRefresh }) {
  // Toàn bộ State (formData, cookingSteps...) giữ nguyên y hệt không đổi một chữ nào!
  
  // Trong useEffect hoặc các hàm xử lý API giữ nguyên biến `id` vì nó đã được truyền từ cha xuống

  // 🟢 Khi sửa thành công (Hàm handleSubmitForm):
  try {
    const response = await apiClient.put(`/admin/recipes/${id}`, payload);
    if (response.data?.success) {
      toast.success('Update recipe successfully!', successToastStyle);
      onRefresh(); // Gọi hàm này để trang danh sách tự load lại data mới
      onClose();   // Đóng popup lại
    }
  } catch (err) { /* ... */ }

  // 🔴 Phần Return giao diện: Bọc nó vào một cái lớp phủ Modal (Overlay)
  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, overflowY: 'auto', padding: '20px' }}>
      <div className="modal-content" style={{ background: '#111827', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Nút Cancel cũ đổi thành gọi hàm đóng onClose */}
        <button type="button" className="btn-primary" style={{ background: '#334155', color: '#fff' }} onClick={onClose}>
          Cancel
        </button>

        {/* Toàn bộ phần thẻ <form>... </form> bên dưới giữ nguyên 100% */}
      </div>
    </div>
  );
}