import {
  PageHeader,
  AdminButton,
  TableCard,
  PlusIcon,
  UploadIcon,
  DownloadIcon,
} from '../../components/hsg-admin/HsgAdminUI';

const PROBLEM_HEADERS = [
  'Tên bài tập',
  'Độ khó / Chủ đề',
  'Trạng thái',
  'Test mẫu',
  'Test ẩn',
  'Cập nhật',
  'Thao tác',
];

export default function ManageProblemsPage({
  onCreateNew,
  onImportJson,
  onDownloadTemplate,
}) {
  return (
    <div className="hsg-page-problems">
      <PageHeader
        title="Quản lý bài tập"
        description="Tạo, cập nhật và quản lý ngân hàng bài tập của bạn."
        actions={
          <>
            <AdminButton
              variant="primary"
              icon={<PlusIcon size={16} />}
              onClick={onCreateNew}
            >
              Tạo bài mới
            </AdminButton>
            <AdminButton
              variant="secondary"
              icon={<UploadIcon size={16} />}
              onClick={onImportJson}
            >
              Nhập JSON
            </AdminButton>
            <AdminButton
              variant="secondary"
              icon={<DownloadIcon size={16} />}
              onClick={onDownloadTemplate}
            >
              Tải mẫu JSON
            </AdminButton>
          </>
        }
      />

      <TableCard
        headers={PROBLEM_HEADERS}
        emptyTitle="Chưa có bài tập nào"
        emptyDesc="Tạo bài tập đầu tiên hoặc nhập dữ liệu từ tệp JSON."
      />
    </div>
  );
}
