import React from 'react';

export function PaginationControls({ total, page, setPage, pageSize, setPageSize, pageSizeOptions = [10, 25, 50, 100] }) {
 const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
 const safePage = Math.min(Math.max(page, 1), totalPages);
 const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
 const end = Math.min(total, safePage * pageSize);
 const border = "#e5e7eb";
 const buttonStyle = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:10, padding:"7px 11px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" };
 const disabledStyle = { opacity:.45, cursor:"not-allowed" };

 return (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", padding:"12px 16px", borderTop:`1px solid ${border}`, color:"#6b7280", fontSize:13 }}>
   <div>{start}-{end} de {total}</div>
   <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
    <span>Filas</span>
    <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ height:34, border:`1px solid ${border}`, borderRadius:10, padding:"0 8px", background:"#fff", fontFamily:"inherit" }}>
     {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
    <button style={{ ...buttonStyle, ...(safePage <= 1 ? disabledStyle : {}) }} disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
    <span style={{ color:"#111827", fontWeight:800 }}>{safePage}/{totalPages}</span>
    <button style={{ ...buttonStyle, ...(safePage >= totalPages ? disabledStyle : {}) }} disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</button>
   </div>
  </div>
 );
}
