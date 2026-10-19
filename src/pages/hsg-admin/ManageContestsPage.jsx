import React from 'react';
import {
  PageHeader,
  AdminButton,
  TableCard,
  PlusIcon,
} from '../../components/hsg-admin/HsgAdminUI';

const CONTEST_HEADERS = [
  'Tên contest',
  'Trạng thái',
  'Bắt đầu',
  'Thời lượng',
  'Số bài',
  'Thao tác',
];

export default function ManageContestsPage({ onCreateContest }) {
  return (
    <div className="hsg-page-contests">
      <PageHeader
        title="Quản lý contest"
        description="Tổ chức kỳ thi và theo dõi các contest trong một không gian."
        actions={
          <AdminButton
            variant="primary"
            icon={<PlusIcon size={16} />}
            onClick={onCreateContest}
          >
            Tạo contest
          </AdminButton>
        }
      />

      <TableCard
        headers={CONTEST_HEADERS}
        emptyTitle="Sẵn sàng cho kỳ thi đầu tiên?"
        emptyDesc="Tạo contest, thêm bài tập và thiết lập thời gian để bắt đầu."
      />
    </div>
  );
}
