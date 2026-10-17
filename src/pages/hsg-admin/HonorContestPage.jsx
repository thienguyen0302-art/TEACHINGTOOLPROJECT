import React from 'react';
import {
  HonorBanner,
  HonorPodium,
  HonorCard,
  HonorFooter,
} from '../../components/hsg-admin/HsgAdminUI';

export default function HonorContestPage() {
  return (
    <div className="hsg-page-honor">
      {/* Banner ngang bo góc chuyển sắc xanh navy sang xanh dương */}
      <HonorBanner
        badge="BẢNG VÀNG CONTEST HSG TOÀN TRƯỜNG"
        title="Mỗi kỳ thi, một bước tiến gần bục vinh quang."
        description="Thứ hạng được cập nhật từ tổng điểm thi Contest HSG của mỗi học sinh."
      />

      {/* Ba thẻ vinh danh: Thứ tự từ trái sang phải là Hạng 2, Hạng 1, Hạng 3 */}
      <HonorPodium>
        <HonorCard
          rank={2}
          rankLabel="Hạng 2"
          title="Chờ vinh danh"
          subtitle="Chưa có kết quả"
        />
        <HonorCard
          rank={1}
          rankLabel="Hạng 1"
          title="Chờ vinh danh"
          subtitle="Chưa có kết quả"
        />
        <HonorCard
          rank={3}
          rankLabel="Hạng 3"
          title="Chờ vinh danh"
          subtitle="Chưa có kết quả"
        />
      </HonorPodium>

      {/* Thông điệp và ghi chú cuối trang */}
      <HonorFooter
        mainText="Chưa có kết quả xếp hạng. Ba vị trí vinh danh sẽ được cập nhật khi có bài thi hợp lệ."
        noteText="BẢN XEM TRƯỚC · Chưa kết nối dữ liệu thi thực tế."
      />
    </div>
  );
}
