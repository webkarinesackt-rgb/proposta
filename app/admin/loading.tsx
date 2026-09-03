// Fallback instantâneo enquanto a aba carrega. Aparece dentro do AdminLayout
// (a barra lateral continua), então a troca de aba mostra feedback na hora em
// vez de "congelar" até a view montar e buscar os dados.
export default function AdminLoading() {
  return (
    <div className="h-full w-full p-5 md:p-8" style={{ background: '#EDEDEA' }} aria-busy="true">
      <div
        className="h-7 w-48 rounded-lg mb-2"
        style={{ background: '#E2E2DE' }}
      />
      <div className="h-4 w-72 rounded-lg mb-6" style={{ background: '#E7E7E3' }} />
      <div className="flex gap-2.5 mb-6 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-40 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }} />
        ))}
      </div>
      <div className="flex flex-col gap-2.5 max-w-4xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
