// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
let USERS_CACHE=[];
function loadUsers(){}
function saveUsers(){}

const UNITS = {
  'Kepala BPKAD': [
    'Kepala BPKAD'
  ],
  'Sekretariat': [
    'Sekretaris BPKAD',
    'Sub Bagian Umum dan Kepegawaian',
    'Kepala Sub Bagian Umum dan Kepegawaian',
    'Sub Bagian Perencanaan Keuangan dan Aset',
    'Kepala Sub Bagian Perencanaan Keuangan dan Aset'
  ],
  'Bidang Perencanaan Anggaran Daerah': [
    'Kepala Bidang Perencanaan Anggaran Daerah',
    'Sub Bidang Perencanaan Anggaran Daerah I',
    'Kepala Sub Bidang Perencanaan Anggaran Daerah I',
    'Sub Bidang Perencanaan Anggaran Daerah II',
    'Kepala Sub Bidang Perencanaan Anggaran Daerah II',
    'Sub Bidang Perencanaan Anggaran Daerah III',
    'Kepala Sub Bidang Perencanaan Anggaran Daerah III'
  ],
  'Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah': [
    'Kepala Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah',
    'Sub Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah I',
    'Kepala Sub Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah I',
    'Sub Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah II',
    'Kepala Sub Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah II',
    'Sub Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah III',
    'Kepala Sub Bidang Perbendaharaan, Akuntansi, dan Pelaporan Keuangan Daerah III'
  ],
  'Bidang Pengelolaan Barang Daerah': [
    'Kepala Bidang Pengelolaan Barang Milik Daerah',
    'Sub Bidang Perencanaan dan Pengamanan Barang Milik Daerah',
    'Kepala Sub Bidang Perencanaan dan Pengamanan Barang Milik Daerah',
    'Sub Bidang Penggunaan, Pemanfaatan, Pemindahtanganan, Pemusnahan, dan Penghapusan',
    'Kepala Sub Bidang Penggunaan, Pemanfaatan, Pemindahtanganan, Pemusnahan, dan Penghapusan',
    'Sub Bidang Penatausahaan Barang Milik Daerah',
    'Kepala Sub Bidang Penatausahaan Barang Milik Daerah'
  ]
};

const GOL_LIST = ['I/a','I/b','I/c','I/d','II/a','II/b','II/c','II/d','III/a','III/b','III/c','III/d','IV/a','IV/b','IV/c','IV/d','IV/e'];
const EDU_MAX = { 'SMP':'II/b', 'SMA/SMK':'III/b', 'D3':'III/b', 'D4':'III/d', 'S1':'III/d', 'S2':'IV/c', 'S3':'IV/e' };
const EDU_LIST = ['SD','SMP','SMA/SMK','D1','D2','D3','D4','S1','S2','S3'];



const PER_PAGE = 10;
let currentPage = 'dashboard';
let session = null;
let pageNums = {};
// ══════════════════════════════════════════════════════
// SUPABASE CONFIG — isi dengan nilai dari project Anda
// Supabase Dashboard → Settings → API
// ══════════════════════════════════════════════════════
const SUPABASE_URL  = 'https://kprvohhfcvltjettgxjb.supabase.co'; // ← GANTI
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5aWFzd21sbmtxdGxkanRwcnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjUxMzAsImV4cCI6MjA5NDYwMTEzMH0.3kl65V5vQl8RVNRKiN9oILwOSjOyCI2AtnzbA9N0u_Q';  // ← GANTI

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── FONNTE TOKEN — diisi otomatis dari tabel settings saat login ─
let FONNTE_TOKEN = '';

// Client-side cache
let DB = { asn:[], pppk:[], pjlp:[], cuti:[], alokasi:{} };

// loadFromServer — Supabase
async function loadFromServer(){
  const [a,b,c]=await Promise.all([
    supa.from('asn').select('*').order('nama'),
    supa.from('pppk').select('*').order('nama'),
    supa.from('pjlp').select('*').order('nama'),
  ]);
  DB.asn=a.data||[]; DB.pppk=b.data||[]; DB.pjlp=c.data||[];
}
async function reloadType(type){
  const {data}=await supa.from(type).select('*').order('nama');
  if(data) DB[type]=data;
}
async function loadCutiFromServer(){
  const {data}=await supa.from('cuti').select('*').order('created_at',{ascending:false});
  if(data) DB.cuti=data;
}
// cuti: [{id,asn_id,nip,nama,unit,jenis_cuti,tgl_mulai,tgl_selesai,
//         hari_kerja,keperluan,status,step,
//         step1_by,step1_at,step1_note,
//         step2_by,step2_at,step2_note,
//         final_by,final_at,final_note,
//         no_surat,tahun,created_at}]
// alokasi: { asn_id: { jenis: { alokasi:N, terpakai:N } } }
// DEF_ALOKASI = global default days, set in cuti module
