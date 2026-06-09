export default function ConfiguracionPage() {
  return (
    <div>
      <div className="page-header">
        <div><h1>Configuración</h1><p>Parámetros del sistema</p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {[
          { title: 'Ramos / Tipos de seguro', desc: 'Incendio, Multirriesgo, Ascensores, Cristales...', icon: '🏷️' },
          { title: 'Compañías aseguradoras', desc: 'BSE, SURA, Mapfre, HDI...', icon: '🏢' },
          { title: 'Corredores', desc: 'Fascioli, externos...', icon: '👤' },
          { title: 'Métodos de pago', desc: 'Transferencia, efectivo, débito...', icon: '💳' },
          { title: 'Monedas', desc: 'Pesos uruguayos, dólares', icon: '💵' },
          { title: 'Usuarios del sistema', desc: 'Accesos y permisos', icon: '🔐' },
        ].map(item => (
          <div key={item.title} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 22px', cursor: 'pointer', transition: 'box-shadow .14s' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: 'var(--slate)' }}>{item.desc}</div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>Próximamente →</div>
          </div>
        ))}
      </div>
    </div>
  )
}
