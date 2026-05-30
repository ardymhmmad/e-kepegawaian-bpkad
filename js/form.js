// ═══════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════
const formDefs={
  asn:[
    {id:'nip',l:'NIP',t:'text',req:true},{id:'nama',l:'Nama Lengkap',t:'text',req:true},
    {id:'pangkat',l:'Pangkat/Golongan',t:'select',opts:GOL_LIST},
    {id:'pendidikan',l:'Pendidikan',t:'select',opts:EDU_LIST},
    {id:'jabatan',l:'Jabatan',t:'text'},{id:'jk',l:'Jenis Kelamin',t:'select',opts:['Laki-laki','Perempuan']},
    {id:'tmt_pangkat',l:'TMT Pangkat',t:'date'},{id:'tmt_kgb',l:'TMT KGB',t:'date'},{id:'gaji',l:'Gaji Pokok (Rp)',t:'number'},
    {id:'no_hp',l:'No. HP / WhatsApp',t:'text'},{id:'email',l:'Email',t:'text'},
    {id:'batas_usia_pensiun',l:'Batas Usia Pensiun (tahun)',t:'number'},
    {id:'masa_kerja_tahun',l:'Masa Kerja Golongan (Tahun)',t:'number'},{id:'masa_kerja_bulan',l:'Masa Kerja Golongan (Bulan)',t:'number'},
    {id:'tgl_sk_kgb_sebelumnya',l:'Tanggal SK KGB Sebelumnya',t:'date'},{id:'no_sk_kgb_sebelumnya',l:'Nomor SK KGB Sebelumnya',t:'text',placeholder:'cth: 800.1.1.1.13/045//BPKAD/2023'},
    {id:'_unit_sub',l:'',t:'unit_sub'}
  ],
  pppk:[
    {id:'nipppk',l:'NIPPPK PW',t:'text',req:true},{id:'nama',l:'Nama Lengkap',t:'text',req:true},
    {id:'pendidikan',l:'Pendidikan',t:'select',opts:EDU_LIST},
    {id:'jabatan',l:'Jabatan',t:'text'},{id:'jk',l:'Jenis Kelamin',t:'select',opts:['Laki-laki','Perempuan']},
    {id:'akhir_kontrak',l:'Akhir Kontrak',t:'date'},{id:'_unit_sub',l:'',t:'unit_sub'}
  ],
  pjlp:[
    {id:'no_pesanan',l:'No. Pesanan',t:'text',req:true},{id:'nama',l:'Nama Lengkap',t:'text',req:true},
    {id:'pendidikan',l:'Pendidikan',t:'select',opts:EDU_LIST},
    {id:'jenis_pekerjaan',l:'Jenis Pekerjaan',t:'select',opts:['Administrasi','Pengemudi','Satpam','Kebersihan']},
    {id:'jabatan',l:'Jabatan',t:'text'},
    {id:'jk',l:'Jenis Kelamin',t:'select',opts:['Laki-laki','Perempuan']},
    {id:'akhir_kontrak',l:'Akhir Kontrak',t:'date'},
    {id:'_unit_sub',l:'',t:'unit_sub'}
  ]
};

function buildFormHTML(type, data={}){
  const defs=formDefs[type]; if(!defs) return '';
  document.getElementById('modal-box').style.maxWidth='700px';
  let h='<div class="form-grid">';
  defs.forEach(f=>{
    if(f.t==='unit_sub'){
      h+=buildUnitSubSelects(data.unit||'',data.subunit||'','ff');
      return;
    }
    h+=`<div class="fg"><label>${f.l}${f.req?' *':''}</label>`;
    if(f.t==='select'){
      h+=`<select id="ff_${f.id}"><option value="">\u2014 Pilih \u2014</option>${f.opts.map(o=>`<option value="${o}"${data[f.id]===o?' selected':''}>${o}</option>`).join('')}</select>`;
    } else {
      h+=`<input type="${f.t}" id="ff_${f.id}" value="${data[f.id]||''}" placeholder="${f.l}">`;
    }
    h+='</div>';
  });
  h+='</div>'; return h;
}
function collectForm(type){
  const defs=formDefs[type]; if(!defs) return {};
  const obj={};
  defs.forEach(f=>{ if(f.t!=='unit_sub') obj[f.id]=document.getElementById('ff_'+f.id)?.value||''; });
  obj.unit=document.getElementById('ff_unit')?.value||'';
  obj.subunit=document.getElementById('ff_subunit')?.value||'';
  return obj;
}

function openAddForm(type){
  if(session?.role==='user'){ showToast('Hak akses tidak cukup','error'); return; }
  document.getElementById('modal-title').textContent='Tambah '+pageConfigs[type].title;
  document.getElementById('modal-body').innerHTML=buildFormHTML(type);
  document.getElementById('modal-footer').innerHTML=`<button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="saveAdd('${type}')">Simpan</button>`;
  document.getElementById('modal').style.display='flex';
}
async function saveAdd(type){
  const obj=collectForm(type);
  const reqs=formDefs[type].filter(f=>f.req);
  for(const f of reqs){ if(!obj[f.id]){ showToast(`Field "${f.l}" wajib diisi`,'error'); return; } }
  Object.keys(obj).forEach(k=>{ if(obj[k]===''||obj[k]===null) delete obj[k]; });
  const btn=document.querySelector('#modal-footer .btn-primary');
  if(btn){ btn.disabled=true; btn.textContent='Menyimpan...'; }
  try{
    const {error}=await supa.from(type).insert(obj);
    if(error) throw new Error(error.message);
    await reloadType(type); closeModal(); refreshTable(type); renderDashboard();
    showToast('Data berhasil ditambahkan','success');
  }catch(e){ showToast('Error: '+e.message,'error'); }
  finally{ if(btn){ btn.disabled=false; btn.textContent='Simpan'; } }
}
function openEditForm(type,id){
  if(session?.role==='user'){ showToast('Hak akses tidak cukup','error'); return; }
  const rec=DB[type].find(r=>r.id===id); if(!rec) return;
  document.getElementById('modal-title').textContent='Edit Data';
  document.getElementById('modal-body').innerHTML=buildFormHTML(type,rec);
  document.getElementById('modal-footer').innerHTML=`<button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="saveEdit('${type}','${id}')">Simpan Perubahan</button>`;
  document.getElementById('modal').style.display='flex';
}
async function saveEdit(type,id){
  const obj=collectForm(type);
  Object.keys(obj).forEach(k=>{ if(obj[k]==='') obj[k]=null; });
  const btn=document.querySelector('#modal-footer .btn-primary');
  if(btn){ btn.disabled=true; btn.textContent='Menyimpan...'; }
  try{
    const {error}=await supa.from(type).update(obj).eq('id',id);
    if(error) throw new Error(error.message);
    await reloadType(type); closeModal();
    if(currentPage==='detail') showDetail(type,id); else refreshTable(type);
    renderDashboard(); showToast('Data berhasil diperbarui','success');
  }catch(e){ showToast('Error: '+e.message,'error'); }
  finally{ if(btn){ btn.disabled=false; btn.textContent='Simpan Perubahan'; } }
}
function deleteRec(type,id){
  if(session?.role!=='admin'){ showToast('Hak akses tidak cukup','error'); return; }
  showConfirm('Hapus Data','Apakah Anda yakin ingin menghapus data ini?',async()=>{
    const {error}=await supa.from(type).delete().eq('id',id);
    if(!error){ await reloadType(type); refreshTable(type); renderDashboard(); showToast('Data berhasil dihapus','success'); }
    else showToast(error.message,'error');
  });
}

// ═══════════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════════
function showDetail(type,id){
  const r=DB[type].find(x=>x.id===id); if(!r) return;
  let html='';
  if(type==='asn'){
    const kp=calcKP(r); const kg=calcKGB(r);
    html=`<div class="detail-hdr">
      <div class="av-lg" onclick="openPhotoModal('asn','${id}')" title="Klik untuk ganti foto"
        style="cursor:pointer;overflow:hidden;transition:opacity .2s;position:relative"
        onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
        ${r.foto
          ? `<img src="${r.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.outerHTML='<div class=av-lg style=cursor:pointer>${initials(r.nama)}</div>'">`
          : initials(r.nama)}
      </div>
      <div><div style="font-size:16px;font-weight:700">${r.nama}</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:3px">${r.jabatan} · ${r.unit}</div>
      <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">
        <span class="badge ${golBadge(r.pangkat)}">${r.pangkat}</span>
        <span class="badge b-gray">${r.pendidikan}</span>
        <span class="badge ${r.jk==='Laki-laki'?'b-blue':'b-amber'}">${r.jk}</span>
        <span class="badge ${kpStatusBadge(kp.status)}">${kp.status}</span>
      </div></div>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn always-allow" onclick="openEditForm('asn','${id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteRec('asn','${id}')">Hapus</button>
      </div></div>
    <div class="detail-grid">
      <div class="dc"><div class="dc-title">Data Pokok</div>
        ${dr('NIP',r.nip)}${dr('Nama',r.nama)}${dr('Jenis Kelamin',r.jk)}${dr('Pendidikan',r.pendidikan)}
      </div>
      <div class="dc"><div class="dc-title">Kepegawaian</div>
        ${dr('Pangkat/Gol','<span class="badge '+golBadge(r.pangkat)+'">'+r.pangkat+'</span>')}
        ${dr('Jabatan',r.jabatan)}${dr('Unit Kerja',r.unit)}${dr('Sub Unit',r.subunit)}
      </div>
      <div class="dc"><div class="dc-title">Kenaikan Pangkat</div>
        ${dr('TMT Pangkat',fmt(r.tmt_pangkat))}
        ${dr('Jatuh Tempo KP',fmtDate(kp.dueDate))}
        ${dr('Pangkat Berikutnya','<span class="badge b-green">'+kp.nextPangkat+'</span>')}
        ${dr('Status','<span class="badge '+kpStatusBadge(kp.status)+'">'+kp.status+'</span>')}
        <div style="font-size:11px;color:var(--tx2);padding:7px 0;line-height:1.5">${kp.keterangan}</div>
      </div>
      <div class="dc"><div class="dc-title">KGB — Gaji Berkala</div>
        ${dr('TMT KGB',fmt(r.tmt_kgb))}
        ${dr('Masa Kerja Golongan',r.masa_kerja_tahun!=null?(r.masa_kerja_tahun+' Tahun '+(r.masa_kerja_bulan||0)+' Bulan'):'—')}
        ${dr('Gaji Saat Ini','Rp '+num(kg.gajiSkrg))}
        ${dr('Jatuh Tempo KGB',fmtDate(kg.due))}
        ${dr('Status KGB','<span class="badge '+kgbBadge(kg.status)+'">'+kg.status+'</span>')}
      </div>
    </div>`;
  } else if(type==='pppk'){
    html=`<div class="detail-hdr">
      <div class="av-lg">${initials(r.nama)}</div>
      <div><div style="font-size:16px;font-weight:700">${r.nama}</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:3px">${r.jabatan} · ${r.unit}</div>
      <div style="margin-top:7px;display:flex;gap:6px"><span class="badge b-blue">PPPK PW</span><span class="badge b-gray">${r.pendidikan}</span></div></div>
      <div style="margin-left:auto"><button class="btn always-allow" onclick="openEditForm('pppk','${id}')">Edit</button></div></div>
    <div class="detail-grid">
      <div class="dc"><div class="dc-title">Data Pokok</div>${dr('NIPPPK PW',r.nipppk)}${dr('Nama',r.nama)}${dr('Jenis Kelamin',r.jk)}${dr('Pendidikan',r.pendidikan)}</div>
      <div class="dc"><div class="dc-title">Penempatan</div>${dr('Jabatan',r.jabatan)}${dr('Unit Kerja',r.unit)}${dr('Sub Unit',r.subunit)}${dr('Akhir Kontrak','<span class="badge '+kontrakBadge(r.akhir_kontrak)+'">'+fmt(r.akhir_kontrak)+'</span>')}</div>
    </div>`;
  } else if(type==='pjlp'){
    html=`<div class="detail-hdr">
      <div class="av-lg">${initials(r.nama)}</div>
      <div><div style="font-size:16px;font-weight:700">${r.nama}</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:3px">${r.jenis_pekerjaan} · ${r.unit}</div>
      <div style="margin-top:7px"><span class="badge b-gray">${r.no_pesanan}</span></div></div>
      <div style="margin-left:auto"><button class="btn always-allow" onclick="openEditForm('pjlp','${id}')">Edit</button></div></div>
    <div class="detail-grid">
      <div class="dc"><div class="dc-title">Data Pokok</div>${dr('No. Pesanan',r.no_pesanan)}${dr('Nama',r.nama)}${dr('Pendidikan',r.pendidikan)}${dr('Jenis Kelamin',r.jk||'—')}${dr('Jenis Pekerjaan',r.jenis_pekerjaan)}${dr('Jabatan',r.jabatan||'—')}</div>
      <div class="dc"><div class="dc-title">Kontrak</div>${dr('Unit Kerja',r.unit)}${dr('Sub Unit',r.subunit)}${dr('Akhir Kontrak','<span class="badge '+kontrakBadge(r.akhir_kontrak)+'">'+fmt(r.akhir_kontrak)+'</span>')}</div>
    </div>`;
  }
  html+=`<div style="margin-top:12px"><button class="btn" onclick="showPage('${type}',null)">← Kembali</button></div>`;
  const dc=document.getElementById('detail-content');
  dc.innerHTML=html;
  dc.dataset.id=id; dc.dataset.type=type;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pt-title').textContent='Detail Pegawai';
  document.getElementById('pt-sub').textContent=r.nama;
  document.getElementById('pt-actions').innerHTML='';
  currentPage='detail';
}
function dr(l,v){ return `<div class="dr"><span class="dr-l">${l}</span><span class="dr-v">${v||'—'}</span></div>`; }

// ═══════════════════════════════════════════════════
// IMPORT EXCEL
// ═══════════════════════════════════════════════════
const importCols={
  asn:['NIP','Nama Lengkap','Pangkat/Golongan','Pendidikan','Jabatan','Jenis Kelamin','Unit Kerja','Sub Unit Kerja','TMT Pangkat','TMT KGB','Gaji Pokok'],
  pppk:['NIPPPK PW','Nama Lengkap','Pendidikan','Jabatan','Jenis Kelamin','Unit Kerja','Sub Unit Kerja','Akhir Kontrak'],
  pjlp:['No. Pesanan','Nama Lengkap','Pendidikan','Jenis Pekerjaan','Jabatan','Jenis Kelamin','Unit Kerja','Sub Unit Kerja','Akhir Kontrak']
};
const importMaps={
  asn:(r)=>({id:'a'+Date.now()+Math.random(),nip:str(r['NIP']),nama:str(r['Nama Lengkap']),pangkat:str(r['Pangkat/Golongan']),pendidikan:str(r['Pendidikan']),jabatan:str(r['Jabatan']),jk:str(r['Jenis Kelamin']),unit:str(r['Unit Kerja']),subunit:str(r['Sub Unit Kerja']),tmt_pangkat:excelDate(r['TMT Pangkat']),tmt_kgb:excelDate(r['TMT KGB']),gaji:str(r['Gaji Pokok'])}),
  pppk:(r)=>({id:'p'+Date.now()+Math.random(),nipppk:str(r['NIPPPK PW']),nama:str(r['Nama Lengkap']),pendidikan:str(r['Pendidikan']),jabatan:str(r['Jabatan']),jk:str(r['Jenis Kelamin']),unit:str(r['Unit Kerja']),subunit:str(r['Sub Unit Kerja']),akhir_kontrak:excelDate(r['Akhir Kontrak'])}),
  pjlp:(r)=>({id:'j'+Date.now()+Math.random(),no_pesanan:str(r['No. Pesanan']),nama:str(r['Nama Lengkap']),pendidikan:str(r['Pendidikan']),jenis_pekerjaan:str(r['Jenis Pekerjaan']),jabatan:str(r['Jabatan']),jk:str(r['Jenis Kelamin']),unit:str(r['Unit Kerja']),subunit:str(r['Sub Unit Kerja']),akhir_kontrak:excelDate(r['Akhir Kontrak'])})
};
const importDupKey={asn:'nip',pppk:'nipppk',pjlp:'no_pesanan'};

function openImport(type){
  if(!_xlsxReady){ showToast('Library Excel belum siap, coba lagi sebentar','error'); return; }
  document.getElementById('modal-title').textContent=`Import Excel — ${pageConfigs[type].title}`;
  const cols=importCols[type];
  document.getElementById('modal-body').innerHTML=`
    <div style="background:var(--primary-bg);border:1px solid var(--primary);border-radius:8px;padding:12px 14px;font-size:12px;margin-bottom:14px">
      <strong>Format Kolom Excel (baris 1 = header):</strong><br>
      <span style="font-family:var(--fmo);font-size:11px;color:var(--primary-tx)">${cols.join(' | ')}</span>
    </div>
    <div class="import-zone" id="iz" onclick="document.getElementById('import-file').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="handleDrop(event,'${type}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <div class="iz-title">Klik atau seret file .xlsx di sini</div>
      <div class="iz-sub">Format: .xlsx · Maks 5MB</div>
    </div>
    <input type="file" id="import-file" accept=".xlsx" style="display:none" onchange="handleImportFile(event,'${type}')">
    <div id="import-result" style="margin-top:12px"></div>`;
  document.getElementById('modal-footer').innerHTML=`<button class="btn" onclick="closeModal()">Tutup</button>`;
  document.getElementById('modal').style.display='flex';
}
function handleDrop(e,type){ e.preventDefault(); document.getElementById('iz').classList.remove('drag'); const f=e.dataTransfer.files[0]; if(f) processImportFile(f,type); }
function handleImportFile(e,type){ const f=e.target.files[0]; if(f) processImportFile(f,type); }

function processImportFile(file, type){
  if(!file.name.endsWith('.xlsx')){ showToast('File harus berformat .xlsx','error'); return; }
  const reader=new FileReader();
  reader.onload=(ev)=>{
    try{
      const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});
      // Cari sheet yang sesuai dengan tipe data
      const sheetNames=wb.SheetNames;
      const typeMap={asn:'Data ASN',pppk:'PPPK PW',pjlp:'PJLP'};
      let targetSheet=sheetNames[0];
      const preferred=typeMap[type];
      if(preferred&&sheetNames.includes(preferred)) targetSheet=preferred;
      const ws=wb.Sheets[targetSheet];

      // Baca semua baris sebagai array mentah (tanpa asumsi baris header)
      const rawRows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',blankrows:false});
      if(!rawRows.length){ showToast('Sheet kosong','error'); return; }

      // Normalisasi nama kolom: hapus *, newline, dan whitespace berlebih
      const normCol=v=>String(v||'').replace(/\*/g,'').replace(/\n/g,' ').replace(/\s+/g,' ').trim();

      // Cari baris header: baris pertama (dari 5 baris teratas) yang memuat semua kolom wajib
      const reqCols=importCols[type];
      let headerRowIdx=-1;
      for(let i=0;i<Math.min(rawRows.length,5);i++){
        const rowCols=rawRows[i].map(normCol);
        const matched=reqCols.filter(rc=>rowCols.includes(rc));
        if(matched.length===reqCols.length){ headerRowIdx=i; break; }
      }

      if(headerRowIdx===-1){
        // Tampilkan debug: kolom apa yang terbaca vs yang dibutuhkan
        const found=[...new Set(rawRows.slice(0,4).flatMap(r=>r.map(normCol).filter(Boolean)))];
        const missing=reqCols.filter(rc=>!found.includes(rc));
        document.getElementById('import-result').innerHTML=`
          <div style="color:var(--red-tx);font-size:12px;background:var(--red-bg);border:1px solid var(--red-bd);border-radius:8px;padding:12px;margin-bottom:8px">
            <strong>Kolom tidak ditemukan:</strong><br>${missing.map(m=>`<code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px">${m}</code>`).join(' &nbsp; ')}
          </div>
          <div style="font-size:12px;color:var(--tx2);background:var(--bg2);border-radius:8px;padding:12px;line-height:1.8">
            <strong>Kolom yang terbaca di file (${targetSheet}):</strong><br>
            ${found.length?found.map(c=>`<code style="background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px">${c}</code>`).join(' '):'(tidak ada)'}
            <br><br>
            <strong>Tips:</strong>
            <ul style="margin:4px 0 0 16px">
              <li>Nama kolom harus persis sama — termasuk spasi, tanda titik, dan huruf kapital</li>
              <li>Gunakan file template resmi yang disediakan</li>
              <li>Pastikan mengisi sheet yang sesuai: <em>${typeMap[type]||type}</em></li>
              <li>Header harus di baris pertama sheet (baris 1)</li>
            </ul>
          </div>`;
        return;
      }

      // Bangun peta kolom: nama kolom → indeks
      const headerRow=rawRows[headerRowIdx];
      const colMap={};
      headerRow.forEach((v,i)=>{ const n=normCol(v); if(n) colMap[n]=i; });

      // Konversi baris data menjadi objek
      const dataRows=rawRows.slice(headerRowIdx+1).filter(r=>r.some(c=>String(c||'').trim()!==''));
      const rows=dataRows.map(r=>{
        const obj={};
        reqCols.forEach(col=>{ const raw=r[colMap[col]]; obj[col]=(raw===undefined||raw===null)?'':raw; });
        return obj;
      });

      if(!rows.length){ showToast('Tidak ada baris data di bawah header','error'); return; }
      validateAndImport(rows, type, headerRowIdx+2);
    } catch(err){
      document.getElementById('import-result').innerHTML=`<div style="color:var(--red-tx);font-size:12px;background:var(--red-bg);border:1px solid var(--red-bd);border-radius:8px;padding:10px">Gagal membaca file: <strong>${err.message}</strong></div>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

function validateAndImport(rows, type, dataStartRow=2){
  const dupKey=importDupKey[type];
  const errors=[];
  const valid=[];
  const dups=[];
  rows.forEach((r,i)=>{
    const mapped=importMaps[type](r);
    const rowNum=dataStartRow+i;
    // required check
    if(!mapped.nama){ errors.push({row:rowNum,msg:'Nama Lengkap kosong'}); return; }
    const keyVal=mapped[dupKey];
    if(!keyVal){ errors.push({row:rowNum,msg:`${dupKey.toUpperCase()} kosong`}); return; }
    // check dup in DB
    if(DB[type].find(x=>x[dupKey]===keyVal)){ dups.push({row:rowNum,key:keyVal,mapped}); return; }
    // check dup in current batch
    if(valid.find(x=>x[dupKey]===keyVal)){ errors.push({row:rowNum,msg:`${dupKey.toUpperCase()} duplikat dalam file`}); return; }
    valid.push(mapped);
  });

  if(errors.length){
    document.getElementById('import-result').innerHTML=`
      <div style="color:var(--red-tx);font-size:12px;margin-bottom:8px;font-weight:700">⚠ ${errors.length} baris mengandung error:</div>
      <table class="validation-table">
        <thead><tr><th>Baris</th><th>Keterangan Error</th></tr></thead>
        <tbody>${errors.map(e=>`<tr><td class="vt-err">Baris ${e.row}</td><td class="vt-err">${e.msg}</td></tr>`).join('')}</tbody>
      </table>
      <div style="font-size:12px;color:var(--tx2);margin-top:8px">Perbaiki file lalu upload ulang.</div>`;
    return;
  }

  if(dups.length){
    // ask confirmation per dup
    processDuplicates(dups, valid, type, 0);
  } else {
    finalizeImport(valid, type);
  }
}

let _pendingImport={};
function processDuplicates(dups,valid,type,idx){
  if(idx>=dups.length){ finalizeImport(valid,type); return; }
  const d=dups[idx];
  const dupKey=importDupKey[type];
  showConfirm(
    `Duplikat Ditemukan (${idx+1}/${dups.length})`,
    `${dupKey.toUpperCase()} <strong>${d.key}</strong> (Baris ${d.row}) sudah ada di sistem.\nApakah data lama ingin ditimpa dengan data baru?`,
    ()=>{ // timpa
      const exIdx=DB[type].findIndex(x=>x[dupKey]===d.key);
      if(exIdx>=0) DB[type][exIdx]={...DB[type][exIdx],...d.mapped};
      processDuplicates(dups,valid,type,idx+1);
    },
    ()=>{ // skip
      processDuplicates(dups,valid,type,idx+1);
    },
    'Timpa Data Lama','Lewati'
  );
}
async function finalizeImport(valid, type){
  const res=document.getElementById('import-result');
  res.innerHTML=`<div style="color:var(--tx3);font-size:12px;padding:8px">Mengunggah ${valid.length} data ke Supabase...</div>`;
  try{
    const keyMap={asn:'nip',pppk:'nipppk',pjlp:'no_pesanan'};
    const key=keyMap[type];
    const existingKeys=DB[type].map(r=>r[key]);
    const toInsert=valid.filter(r=>!existingKeys.includes(r[key])).map(r=>{
      const o={...r}; Object.keys(o).forEach(k=>{ if(o[k]===''||o[k]===undefined) delete o[k]; }); return o;
    });
    const skipped=valid.length-toInsert.length;
    if(toInsert.length){
      const {error}=await supa.from(type).insert(toInsert);
      if(error) throw new Error(error.message);
    }
    await reloadType(type); refreshTable(type); renderDashboard();
    res.innerHTML=`<div style="color:var(--grn-tx);font-size:13px;font-weight:700;background:var(--grn-bg);border:1px solid var(--grn-bd);border-radius:8px;padding:12px">✓ Import berhasil — ${toInsert.length} data disimpan${skipped?`, ${skipped} duplikat dilewati`:''}.</div>`;
    document.getElementById('modal-footer').innerHTML=`<button class="btn btn-success" onclick="closeModal()">Selesai</button>`;
    showToast(`Import berhasil: ${toInsert.length} data tersimpan`,'success');
  }catch(e){
    res.innerHTML=`<div style="color:var(--red-tx);font-size:12px;background:var(--red-bg);border-radius:8px;padding:10px">✗ ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════
// EXPORT EXCEL
// ═══════════════════════════════════════════════════
function exportExcel(type){
  if(!_xlsxReady){ showToast('Library Excel belum siap, coba lagi sebentar','error'); return; }
  let data,name;
  if(type==='kp'){
    data=DB.asn.map(a=>{ const k=calcKP(a); return {NIP:a.nip,'Nama ASN':a.nama,'Golongan Saat Ini':a.pangkat,'Golongan Berikutnya':k.nextPangkat,'Pendidikan':a.pendidikan,'Unit Kerja':a.unit,'TMT Pangkat':a.tmt_pangkat,'Tgl Jatuh Tempo':fmtDate(k.dueDate),'Status':k.status,'Keterangan':k.keterangan}; });
    name='KP';
  } else if(type==='kgb'){
    data=DB.asn.map(a=>{ const k=calcKGB(a); return {NIP:a.nip,'Nama ASN':a.nama,'Unit Kerja':a.unit,'Golongan':a.pangkat,'TMT KGB':a.tmt_kgb,'Gaji Saat Ini':k.gajiSkrg,'Tgl KGB Berikutnya':fmtDate(k.due),'Status':k.status}; });
    name='KGB';
  } else if(type==='asn'){
    data=DB.asn.map(r=>({NIP:r.nip,'Nama Lengkap':r.nama,'Pangkat/Golongan':r.pangkat,Pendidikan:r.pendidikan,Jabatan:r.jabatan,'Jenis Kelamin':r.jk,'Unit Kerja':r.unit,'Sub Unit':r.subunit,'TMT Pangkat':r.tmt_pangkat,'TMT KGB':r.tmt_kgb,'Gaji Pokok':r.gaji,'Masa Kerja Tahun':r.masa_kerja_tahun||0,'Masa Kerja Bulan':r.masa_kerja_bulan||0}));
    name='ASN';
  } else if(type==='pppk'){
    data=DB.pppk.map(r=>({'NIPPPK PW':r.nipppk,'Nama Lengkap':r.nama,Pendidikan:r.pendidikan,Jabatan:r.jabatan,'Jenis Kelamin':r.jk,'Unit Kerja':r.unit,'Sub Unit':r.subunit,'Akhir Kontrak':r.akhir_kontrak}));
    name='PPPK_PW';
  } else if(type==='pjlp'){
    data=DB.pjlp.map(r=>({'No. Pesanan':r.no_pesanan,'Nama Lengkap':r.nama,Pendidikan:r.pendidikan,'Jenis Pekerjaan':r.jenis_pekerjaan,'Jabatan':r.jabatan||'','Jenis Kelamin':r.jk||'','Unit Kerja':r.unit,'Sub Unit':r.subunit,'Akhir Kontrak':r.akhir_kontrak}));
    name='PJLP';
  }
  if(!data) return;
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb,ws,name);
  XLSX.writeFile(wb,`SIMPEG_${name}_${today()}.xlsx`);
  showToast(`Export ${name} berhasil`,'success');
}
