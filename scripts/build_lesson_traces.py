"""Build deterministic, authored traces for the fixed curriculum examples.

No student code is evaluated. Each emit corresponds to the displayed source;
state is shown AFTER the highlighted operation (or at its condition check).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'src/content'


def build(chapter, theory, language):
    cpp = language == 'cpp'
    code = theory['code'].splitlines()
    steps, state = [], {}

    def emit(py, cc, title, **changes):
        line = cc if cpp else py
        state.update(changes)
        cells = [dict(label=k, value=json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v,
                      active=k in changes) for k, v in state.items()]
        step = dict(line=line, title=title, explanation=f'{title}. Dòng {line}: {code[line-1].strip()}',
                    cells=cells or [dict(label='Chương trình', value=title, active=True)])
        for key in ('dp', 'p', 'a'):
            value = state.get(key)
            if isinstance(value, list) and value:
                if all(isinstance(row, list) for row in value):
                    step['matrix'] = dict(rows=value, activeCells=[])
                elif all(isinstance(x, (int, bool, str)) for x in value):
                    step['array'] = dict(values=value, activeIndices=[])
                break
        # Freeze snapshots before the algorithm changes arrays in place.
        steps.append(json.loads(json.dumps(step, ensure_ascii=False)))

    if cpp and chapter != 'ch01':
        for n, source in enumerate(code, 1):
            if source.startswith('#include'):
                emit(1, n, 'Chuẩn bị thư viện trước khi chạy')
            elif source.startswith('using namespace'):
                emit(1, n, 'Khai báo không gian tên, chưa chạy thuật toán')
        main = next(i for i, s in enumerate(code, 1) if 'int main()' in s)
        emit(1, main, 'Bắt đầu thực thi tại main')
        emit(1, main + 1, 'Thiết lập nhập xuất')
        emit(1, main + 2, 'Thiết lập luồng nhập')

    if chapter == 'ch01':
        if cpp:
            emit(1, 1, 'Khai báo a, chưa được đọc giá trị', a='chưa gán')
            emit(1, 2, 'Gán a bằng 10', a=10)
            emit(1, 4, 'Khởi tạo b', b=20)
            emit(1, 6, 'Khởi tạo total', total=0)
        else:
            emit(1, 1, 'Gán a', a=10)
            emit(2, 1, 'Gán name', name='An')
            emit(3, 1, 'Gán x', x=3.14)
    elif chapter == 'ch02':
        emit(1, 9, 'Khởi tạo x', x=-3)
        emit(2, 10, 'Kiểm tra x > 0: sai, bỏ nhánh dương')
        emit(4, 12, 'Kiểm tra x == 0: sai')
        emit(6, 14, 'Đi vào nhánh else')
        emit(7, 15, 'Xuất kết quả', Output='AM')
    elif chapter == 'ch03':
        emit(1, 9, 'Khởi tạo tổng', s=0)
        for i in range(1, 5):
            emit(2, 10, 'Lượt lặp tiếp theo, điều kiện còn đúng', i=i)
            emit(3, 11, 'Cộng i vào tổng', s=state['s']+i)
        emit(2, 10, 'Hết lượt lặp, thoát for', **({'i':5} if cpp else {}))
        emit(4, 12, 'Xuất tổng', Output='10')
    elif chapter == 'ch04':
        emit(1, 9, 'Khởi tạo dãy', a=[4,2,7])
        emit(2, 10, 'Thay phần tử ở chỉ số 1', a=[4,5,7])
        output_array(emit, state, cpp, 3, 11, 12)
    elif chapter == 'ch05':
        emit(1, 9, 'Khởi tạo chuỗi', s='level')
        emit(2, 10, 'Đặt hai con trỏ', l=0, r=4)
        emit(3, 11, 'Khởi tạo cờ đối xứng', ok=True)
        while True:
            l,r=state['l'],state['r']
            emit(4, 12, f'Kiểm tra l < r: {"đúng" if l<r else "sai"}')
            if l>=r: break
            emit(5, 13, 'Hai ký tự bằng nhau: không vào nhánh sai')
            emit(8, 17, 'Tăng con trỏ trái', l=l+1)
            emit(9, 18, 'Giảm con trỏ phải', r=r-1)
        emit(10,20,'Xuất kết quả',Output='YES')
    elif chapter == 'ch06':
        if not cpp: emit(1,5,'Định nghĩa fact, chưa chạy thân hàm')
        emit(6,13,'Gọi fact(4), chờ kết quả để xuất')
        def fact(n):
            emit(2,6,f'Vào fact({n}), kiểm tra n == 0: {"đúng" if n==0 else "sai"}', n=n)
            if n==0:
                emit(3,7,'Trả về giá trị cơ sở', returned=1)
                return 1
            emit(4,8,f'Tạm dừng fact({n}) để gọi fact({n-1})')
            value=n*fact(n-1)
            emit(4,8,f'Trở lại fact({n}), nhân và trả kết quả',n=n,returned=value)
            return value
        value=fact(4)
        emit(6,13,'Xuất kết quả hàm',Output=str(value))
    elif chapter == 'ch07':
        emit(1,9,'Khởi tạo n',n=4,**({'count':0} if cpp else {}))
        if not cpp: emit(2,9,'Khởi tạo bộ đếm',count=0)
        for i in range(4):
            emit(3,10,'Bắt đầu lượt vòng ngoài',i=i)
            for j in range(i):
                emit(4,11,'Điều kiện vòng trong đúng',j=j)
                emit(5,12,'Tăng bộ đếm',count=state['count']+1)
            emit(4,11,'Vòng trong kết thúc',**({'j':i} if cpp else {}))
        emit(3,10,'Vòng ngoài kết thúc',**({'i':4} if cpp else {}))
        emit(6,13,'Xuất số lượt',Output='6')
    elif chapter == 'ch08' and theory['id']=='theory01':
        emit(1,10,'Khởi tạo dãy',a=[5,1,3,1])
        emit(2,11,'Sắp xếp dãy',**({'a':[1,1,3,5]} if cpp else {'b':[1,1,3,5]}))
        output_array(emit,state,cpp,3,12,13,'a' if cpp else 'b')
    elif chapter == 'ch08':
        a=[3,1,2]
        emit(1,9,'Khởi tạo dãy',a=a)
        for i in range(1,len(a)):
            emit(2,10,'Lượt chèn tiếp theo',i=i)
            x,j=a[i],i-1
            emit(3,11,'Giữ giá trị cần chèn',x=x,j=j)
            while True:
                ok=j>=0 and a[j]>x
                emit(4,12,f'Kiểm tra điều kiện dịch: {"đúng" if ok else "sai"}')
                if not ok: break
                a[j+1]=a[j]
                emit(5,13,'Dịch phần tử sang phải',a=a)
                j-=1
                emit(6,14,'Lùi chỉ số j',j=j)
            a[j+1]=x
            emit(7,16,'Chèn x vào vị trí trống',a=a)
        emit(2,10,'Kết thúc vòng chèn',**({'i':3} if cpp else {}))
        output_array(emit,state,cpp,8,18,19)
    elif chapter == 'ch09':
        a=[1,3,3,7]; l,r=0,4
        emit(1,9,'Khởi tạo dãy',a=a)
        emit(2,10,'Khởi tạo giá trị tìm kiếm',x=3,**({'l':l,'r':r} if cpp else {}))
        if not cpp: emit(3,10,'Khởi tạo biên',l=l,r=r)
        while True:
            emit(4,11,f'Kiểm tra l < r: {"đúng" if l<r else "sai"}')
            if l>=r: break
            m=(l+r)//2
            emit(5,12,'Tính vị trí giữa',m=m)
            emit(6,13,f'Kiểm tra a[m] < x: {"đúng" if a[m]<3 else "sai"}')
            if a[m]<3:
                l=m+1; emit(7,14,'Cập nhật biên trái',l=l)
            else:
                r=m; emit(9,16,'Cập nhật biên phải',r=r)
        emit(10,18,'Xuất vị trí',Output=str(l))
    elif chapter == 'ch10':
        a=[2,-1,4,3]; p=[0]*5 if cpp else [0]
        emit(1,9,'Khởi tạo dãy',a=a)
        emit(2,10,'Khởi tạo prefix',p=p)
        for i,x in enumerate(a):
            emit(3,11,'Bắt đầu lượt tính prefix',**({'i':i} if cpp else {'x':x}))
            if cpp: p[i+1]=p[i]+x
            else: p.append(p[-1]+x)
            emit(4,12,'Cộng phần tử vào prefix',p=p)
        emit(3,11,'Kết thúc vòng lặp',**({'i':4} if cpp else {}))
        emit(5,13,'Lấy hiệu hai prefix',Output=str(p[4]-p[1]))
    elif chapter == 'ch11':
        a=[1,2,4,7]; l,r=0,3
        emit(1,9,'Khởi tạo dữ liệu',a=a,**({} if cpp else {'k':6}))
        emit(2,10,'Khởi tạo hai con trỏ',l=l,r=r,k=6)
        emit(3,11,'Khởi tạo cờ',ok=False)
        while l<r:
            emit(4,12,'Điều kiện l < r đúng')
            s=a[l]+a[r]; emit(5,13,'Tính tổng hai đầu',s=s)
            emit(6,14,f'Kiểm tra s == k: {"đúng" if s==6 else "sai"}')
            if s==6:
                emit(7,15,'Tìm thấy cặp',ok=True); emit(8,16,'Break: thoát vòng lặp'); break
            emit(9,18,f'Kiểm tra s < k: {"đúng" if s<6 else "sai"}')
            if s<6: l+=1; emit(10,19,'Tăng l',l=l)
            else: r-=1; emit(12,21,'Giảm r',r=r)
        emit(13,23,'Xuất kết quả',Output='YES')
    elif chapter == 'ch12':
        p=[True]*11; key='p' if cpp else 'is_prime'
        emit(1,9,'Khởi tạo giới hạn',n=10)
        emit(2,10,'Khởi tạo ứng viên nguyên tố',**{key:p})
        p[0]=p[1]=False; emit(3,11,'Loại 0 và 1',**{key:p})
        i=2
        if not cpp: emit(4,12,'Khởi tạo i',i=i)
        while True:
            emit(5,12,f'Kiểm tra i*i <= n: {"đúng" if i*i<=10 else "sai"}',i=i)
            if i*i>10: break
            emit(6,13,'Kiểm tra ứng viên: đúng')
            for j in range(i*i,11,i):
                emit(7,14,'Chọn bội cần loại',j=j)
                p[j]=False; emit(8,15,'Đánh dấu hợp số',**{key:p})
            emit(7,14,'Kết thúc vòng bội',**({'j':j+i} if cpp else {}))
            i+=1
            if not cpp: emit(9,12,'Tăng i',i=i)
        if cpp:
            out=[]
            for i in range(2,11):
                emit(10,16,'Duyệt kết quả',i=i)
                emit(10,17,f'Kiểm tra p[i]: {"đúng" if p[i] else "sai"}')
                if p[i]: out.append(str(i)); emit(10,18,'Xuất số nguyên tố',Output=' '.join(out))
            emit(10,16,'Kết thúc xuất',i=11)
        else: emit(10,18,'Xuất các số nguyên tố',Output='2 3 5 7')
    elif chapter == 'ch13':
        a=[[1,3],[2,5],[3,4],[4,6]]
        emit(1,10,'Khởi tạo hoạt động',a=a)
        a.sort(key=lambda x:x[1]); emit(2,11,'Sắp theo thời điểm kết thúc',a=a)
        end,count=-1,0; emit(3,12,'Khởi tạo lịch',end=end,count=count)
        for s,e in a:
            emit(4,13,'Xét hoạt động tiếp theo',s=s,e=e)
            emit(5,14,f'Kiểm tra s >= end: {"đúng" if s>=end else "sai"}')
            if s>=end:
                count+=1; emit(6,15,'Chọn hoạt động',count=count)
                end=e; emit(7,16,'Cập nhật mốc kết thúc',end=end)
        emit(4,13,'Hết hoạt động')
        emit(8,18,'Xuất số hoạt động',Output=str(count))
    elif theory['id']=='theory02':
        dp=[0]*6
        emit(1,9,'Khởi tạo số bậc',n=5)
        emit(2,10,'Khởi tạo bảng',dp=dp)
        dp[0]=1; emit(3,11,'Đặt trạng thái cơ sở',dp=dp)
        for i in range(1,6):
            emit(4,12,'Xét bậc tiếp theo',i=i)
            dp[i]=dp[i-1]; emit(5,13,'Lấy số cách từ bậc trước',dp=dp)
            emit(6,14,f'Kiểm tra i >= 2: {"đúng" if i>=2 else "sai"}')
            if i>=2: dp[i]+=dp[i-2]; emit(7,15,'Cộng nhóm bước dài 2',dp=dp)
        emit(4,12,'Kết thúc vòng lặp',**({'i':6} if cpp else {}))
        emit(8,17,'Xuất số cách',Output=str(dp[5]))
    elif theory['id']=='theory04':
        emit(1,10,'Khởi tạo vật',items=[[2,3],[3,4]],**({} if cpp else {'capacity':5}))
        if cpp: emit(1,11,'Khởi tạo sức chứa',capacity=5)
        dp=[0]*6; emit(2,12,'Khởi tạo bảng',dp=dp)
        for w,v in [[2,3],[3,4]]:
            emit(3,13,'Lấy vật tiếp theo',w=w,v=v)
            for c in range(5,w-1,-1):
                emit(4,14,'Duyệt sức chứa giảm dần',c=c)
                dp[c]=max(dp[c],dp[c-w]+v); emit(5,15,'Cập nhật giá trị tốt nhất',dp=dp)
            emit(4,14,'Kết thúc lượt vật này',**({'c':w-1} if cpp else {}))
        emit(3,13,'Đã xét hết vật')
        emit(6,16,'Xuất giá trị tốt nhất',Output=str(dp[5]))
    else:
        a,b='abc','ac'; dp=[[0]*3 for _ in range(4)]
        emit(1,10,'Khởi tạo hai chuỗi',a=a,b=b)
        emit(2,11,'Khởi tạo bảng LCS',dp=dp)
        for i in range(1,4):
            emit(3,12,'Xét tiền tố chuỗi a',i=i)
            for j in range(1,3):
                emit(4,13,'Xét tiền tố chuỗi b',j=j)
                equal=a[i-1]==b[j-1]; emit(5,14,f'So sánh hai ký tự: {"bằng nhau" if equal else "khác nhau"}')
                if equal: dp[i][j]=dp[i-1][j-1]+1; emit(6,15,'Lấy đường chéo cộng 1',dp=dp)
                else: dp[i][j]=max(dp[i-1][j],dp[i][j-1]); emit(8,17,'Lấy max ô trên và ô trái',dp=dp)
            emit(4,13,'Kết thúc hàng',**({'j':3} if cpp else {}))
        emit(3,12,'Kết thúc bảng',**({'i':4} if cpp else {}))
        emit(9,18,'Xuất độ dài LCS',Output=str(dp[-1][-1]))
    return steps


def output_array(emit,state,cpp,py,loop,output,key='a'):
    values=state[key]
    if cpp:
        out=[]
        for value in values:
            emit(py,loop,'Lấy phần tử tiếp theo',x=value)
            out.append(str(value)); emit(py,output,'Xuất phần tử',Output=' '.join(out))
        emit(py,loop,'Hết phần tử, thoát vòng lặp')
    else: emit(py,output,'Xuất dãy',Output=' '.join(map(str,values)))


if __name__ == '__main__':
    count=0
    for language in ('cpp','python'):
        for path in sorted((ROOT/language).glob('ch*.json')):
            chapter=json.loads(path.read_text())
            for theory in chapter['theory']:
                visual=theory.get('visualization')
                if not visual: continue
                visual['steps']=build(chapter['id'],theory,language)
                visual['description']='Theo dõi từ đầu: khởi tạo, kiểm tra điều kiện, từng lượt lặp và kết quả. Giá trị hiển thị sau thao tác được tô sáng.'
                count+=1
            path.write_text(json.dumps(chapter,ensure_ascii=False,indent=2)+'\n')
    print(f'Updated {count} complete authored traces.')
