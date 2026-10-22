// Xoá SẠCH một email khỏi PeanutCode để lần đăng nhập sau được coi là tài khoản mới hoàn toàn.
//
// Cách dùng (chạy trên máy có quyền Firebase của project):
//   export GOOGLE_APPLICATION_CREDENTIALS=/duong/dan/service-account.json   (hoặc: gcloud auth application-default login)
//   node scripts/reset-account.mjs email1@gmail.com [email2@gmail.com ...]          # chạy thử, CHỈ liệt kê
//   node scripts/reset-account.mjs email1@gmail.com --yes                           # xoá thật
//   node scripts/reset-account.mjs --all [--yes]                                    # TẤT CẢ tài khoản (kể cả giáo viên)
//   node scripts/reset-account.mjs email1@gmail.com --yes --purge-authored          # xoá luôn bài/contest do email này tạo
//
// Xoá: Firebase Auth user, users/{uid} + mọi subcollection, reviews/{uid}, bảng điểm & bài nộp contest,
//      bugReports của uid. Mặc định KHÔNG xoá bài tập/contest/thông báo do giáo viên tạo (createdBy) —
//      thêm --purge-authored nếu muốn xoá cả những thứ đó.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const apply = args.includes('--yes');
const purgeAuthored = args.includes('--purge-authored');
const all = args.includes('--all');
const emails = args.filter((a) => !a.startsWith('--')).map((e) => e.trim().toLowerCase());
if (!emails.length && !all) {
  console.error('Thiếu email. Ví dụ: node scripts/reset-account.mjs ban@gmail.com --yes  (hoặc --all để xoá TẤT CẢ tài khoản)');
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || 'peanutcode-hsgtinhoc';
const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const db = getFirestore(app);

const log = (...m) => console.log(apply ? '[XOÁ]' : '[CHẠY THỬ]', ...m);

async function findUids(email) {
  const uids = new Set();
  try { uids.add((await auth.getUserByEmail(email)).uid); } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  // Hồ sơ Firestore mồ côi (Auth đã xoá nhưng users/{uid} còn lại) vẫn có thể giữ role=teacher.
  for (const field of ['email']) {
    const snap = await db.collection('users').where(field, '==', email).get();
    snap.forEach((d) => uids.add(d.id));
  }
  return [...uids];
}

async function del(ref, label) {
  log(label);
  if (apply) await ref.delete();
}

async function purgeUid(uid) {
  const userRef = db.doc(`users/${uid}`);
  log(`users/${uid} (+ toàn bộ subcollection)`);
  if (apply) await db.recursiveDelete(userRef);

  await del(db.doc(`reviews/${uid}`), `reviews/${uid}`);

  const contests = await db.collection('contests').get();
  for (const c of contests.docs) {
    await del(c.ref.collection('scoreboard').doc(uid), `${c.ref.path}/scoreboard/${uid}`);
    const subs = await c.ref.collection('submissions').where('uid', '==', uid).get();
    for (const s of subs.docs) await del(s.ref, s.ref.path);
  }

  const bugs = await db.collection('bugReports').where('uid', '==', uid).get();
  for (const b of bugs.docs) await del(b.ref, b.ref.path);

  for (const col of ['problems', 'contests', 'announcements']) {
    const owned = await db.collection(col).where('createdBy', '==', uid).get();
    for (const d of owned.docs) {
      if (purgeAuthored) await del(d.ref, `${d.ref.path} (do tài khoản này tạo)`);
      else console.log(`[GIỮ] ${d.ref.path} do tài khoản này tạo (thêm --purge-authored để xoá)`);
    }
  }

  log(`Firebase Auth user ${uid}`);
  if (apply) await auth.deleteUser(uid).catch((e) => { if (e.code !== 'auth/user-not-found') throw e; });
}

async function allUids() {
  const uids = new Set();
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    page.users.forEach((u) => uids.add(u.uid));
    token = page.pageToken;
  } while (token);
  (await db.collection('users').select().get()).forEach((d) => uids.add(d.id));
  (await db.collection('reviews').select().get()).forEach((d) => uids.add(d.id));
  return [...uids];
}

if (all) {
  const uids = await allUids();
  console.log(`\n=== TẤT CẢ tài khoản: ${uids.length} ===`);
  for (const uid of uids) await purgeUid(uid);
}

for (const email of emails) {
  console.log(`\n=== ${email} ===`);
  const uids = await findUids(email);
  if (!uids.length) { console.log('Không tìm thấy tài khoản/hồ sơ nào cho email này.'); continue; }
  for (const uid of uids) await purgeUid(uid);
}
console.log(apply ? '\nXong. Đăng nhập lại bằng email này sẽ là tài khoản mới.' : '\nĐây chỉ là chạy thử. Thêm --yes để xoá thật.');
console.log('Lưu ý: trên trình duyệt cũ hãy xoá dữ liệu trang (localStorage/sessionStorage) hoặc dùng cửa sổ ẩn danh.');
