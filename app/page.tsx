'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Producto = {
  id: number
  nombre: string
  precio: number
  categoria: string
  requiere_masa: boolean
}

type ItemCarrito = Producto & {
  cantidad: number
  masa: string | null
}

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [masa, setMasa] = useState<'arroz' | 'maiz' | null>(null)
  const [cantidad, setCantidad] = useState(1)

  // --- NUEVO: Estado del Carrito ---
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])

  useEffect(() => {
    async function traerProductos() {
      const { data, error } = await supabase.from('productos').select('*')
      if (!error) setProductos(data || [])
      setCargando(false)
    }
    traerProductos()
  }, [])

  const pupusas = productos.filter(p => p.categoria === 'pupusa')
  const extras = productos.filter(p => p.categoria === 'extra')

  const abrirModal = (producto: Producto) => {
    setProductoSeleccionado(producto)
    setMasa(null)
    setCantidad(1)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setProductoSeleccionado(null)
  }

  // --- NUEVO: Función para agregar al carrito ---
  const agregarAlCarrito = () => {
    if (!productoSeleccionado) return

    // Verificamos si el producto ya está en el carrito con la misma masa
    const existeIndex = carrito.findIndex(
      item => item.id === productoSeleccionado.id && item.masa === masa
    )

    if (existeIndex >= 0) {
      // Si ya existe, solo sumamos la cantidad
      const nuevoCarrito = [...carrito]
      nuevoCarrito[existeIndex].cantidad += cantidad
      setCarrito(nuevoCarrito)
    } else {
      // Si no existe, lo agregamos como nuevo
      setCarrito([...carrito, { ...productoSeleccionado, cantidad, masa }])
    }

    cerrarModal()
  }

  // Calcular total y cantidad de items
  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
  const itemsCarrito = carrito.reduce((acc, item) => acc + item.cantidad, 0)

  return (
    <main className="min-h-screen bg-[#FAF3E8] p-4 pb-24 relative">
      <header className="bg-[#6B1B1B] text-white p-4 rounded-lg shadow-md mb-6 sticky top-4 z-10">
        <h1 className="text-2xl font-bold text-center">Dulce Herencia</h1>
      </header>
      
      {cargando ? (
        <p className="text-center text-[#6B1B1B] font-semibold text-lg mt-10">Cargando menú...</p>
      ) : (
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl text-[#6B1B1B] font-bold mb-4">Pupusas</h2>
          <div className="grid gap-4 mb-8">
            {pupusas.map((pupusa) => (
              <div key={pupusa.id} className="bg-white p-4 rounded-xl shadow-sm border border-[#e8dac7] flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{pupusa.nombre}</h3>
                  <p className="text-[#E67E22] font-bold">${pupusa.precio.toFixed(2)}</p>
                </div>
                <button onClick={() => abrirModal(pupusa)} className="bg-[#6B1B1B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-900 transition-colors">
                  Agregar
                </button>
              </div>
            ))}
          </div>

          <h2 className="text-2xl text-[#6B1B1B] font-bold mb-4">Extras</h2>
          <div className="grid gap-4">
            {extras.map((extra) => (
              <div key={extra.id} className="bg-white p-4 rounded-xl shadow-sm border border-[#e8dac7] flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{extra.nombre}</h3>
                  <p className="text-[#E67E22] font-bold">${extra.precio.toFixed(2)}</p>
                </div>
                <button onClick={() => abrirModal(extra)} className="bg-[#6B1B1B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-900 transition-colors">
                  Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- NUEVO: Barra flotante del carrito --- */}
      {itemsCarrito > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#e8dac7] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-40 flex justify-center">
          <button 
            onClick={() => alert(`Tienes ${itemsCarrito} items en el carrito por un total de $${totalCarrito.toFixed(2)}`)}
            className="w-full max-w-md bg-[#6B1B1B] text-white py-3 rounded-xl font-bold text-lg flex justify-between px-6 hover:bg-red-900 transition-colors"
          >
            <span>{itemsCarrito} items</span>
            <span>Ver carrito · ${totalCarrito.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* MODAL */}
      {modalAbierto && productoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-end">
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>
            <h3 className="text-2xl font-bold text-[#6B1B1B] mb-1">{productoSeleccionado.nombre}</h3>
            <p className="text-[#E67E22] font-bold mb-4">${productoSeleccionado.precio.toFixed(2)}</p>

            {productoSeleccionado.requiere_masa && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Elige la masa:</p>
                <div className="flex gap-2">
                  <button onClick={() => setMasa('arroz')} className={`flex-1 py-2 rounded-lg border-2 transition-colors ${masa === 'arroz' ? 'border-[#6B1B1B] bg-[#FAF3E8] text-[#6B1B1B] font-bold' : 'border-gray-200 text-gray-600'}`}>Arroz</button>
                  <button onClick={() => setMasa('maiz')} className={`flex-1 py-2 rounded-lg border-2 transition-colors ${masa === 'maiz' ? 'border-[#6B1B1B] bg-[#FAF3E8] text-[#6B1B1B] font-bold' : 'border-gray-200 text-gray-600'}`}>Maíz</button>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Cantidad:</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-xl flex items-center justify-center hover:bg-gray-200">−</button>
                <span className="text-xl font-bold w-8 text-center">{cantidad}</span>
                <button onClick={() => setCantidad(cantidad + 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold text-xl flex items-center justify-center hover:bg-gray-200">+</button>
              </div>
            </div>

            <button 
              onClick={agregarAlCarrito}
              disabled={productoSeleccionado.requiere_masa && !masa}
              className="w-full bg-[#6B1B1B] text-white py-3 rounded-xl font-bold text-lg hover:bg-red-900 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Agregar · ${(productoSeleccionado.precio * cantidad).toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}