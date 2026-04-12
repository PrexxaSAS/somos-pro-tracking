import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = "https://cfvvnvmezmrxehpaqayw.supabase.co";
const supabaseAnonKey = "sb_publishable_eBpQfxNAN0jQf1ywEpIRiA_4ayiw7nZ";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SomosProTracking() {
  const [pedidos, setPedidos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ email: "admin@empresa.com", role: "admin" }); // Login simulado por ahora

  // --- CARGAR DATOS REALES ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: pedidosData } = await supabase.from('pedidos').select('*, conductores(nombre, transportadoras(razon_social))');
    const { data: conductoresData } = await supabase.from('conductores').select('*, transportadoras(razon_social)');
    
    if (pedidosData) setPedidos(pedidosData);
    if (conductoresData) setConductores(conductoresData);
    setLoading(false);
  };

  // --- FUNCIÓN PARA CREAR PEDIDO CON CAJAS ---
  const crearPedido = async (nuevoPedido) => {
    const { data, error } = await supabase
      .from('pedidos')
      .insert([{
        barcode: nuevoPedido.barcode,
        cliente_nombre: nuevoPedido.cliente,
        cantidad_cajas: parseInt(nuevoPedido.cajas), // NUEVO CAMPO
        peso: nuevoPedido.peso,
        estado: 'Picking'
      }]);
    
    if (error) alert("Error al crear: " + error.message);
    else fetchData();
  };

  // --- RENDERIZADO DE LA INTERFAZ ---
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Somos PRO Tracking - Panel de Control</h1>
      
      {/* SECCIÓN DE RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#7c3aed', color: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3>Pedidos Totales</h3>
          <p style={{ fontSize: '24px' }}>{pedidos.length}</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #7c3aed', padding: '20px', borderRadius: '12px' }}>
          <h3>Cajas en Tránsito</h3>
          <p style={{ fontSize: '24px' }}>
            {pedidos.reduce((acc, p) => acc + (p.cantidad_cajas || 0), 0)}
          </p>
        </div>
      </div>

      {/* TABLA DE PEDIDOS */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Barcode</th>
            <th>Cliente</th>
            <th>Cajas</th>
            <th>Estado</th>
            <th>Transportadora</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>{p.barcode}</td>
              <td>{p.cliente_nombre}</td>
              <td><strong>{p.cantidad_cajas}</strong></td>
              <td>{p.estado}</td>
              <td>{p.conductores?.transportadoras?.razon_social || 'Pendiente'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
