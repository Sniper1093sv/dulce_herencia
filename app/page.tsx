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

  // Estados del Modal de Producto
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [masa, setMasa] = useState<'arroz' | 'maiz' | null>(null)
  const [cantidad, setCantidad] = useState(1)

  // Estados del Carrito
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [mostrarCarrito, setMostrarCarrito] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [enviando, setEnviando] = useState(false)
  
  // Estado para la pantalla de éxito
    const [pedidoExitoso, setPedidoExitoso] = useState<{ 
    numero: number, 
    tiempo: number, 
    fecha: string, 
    items: ItemCarrito[], 
    total: number 
  } | null>(null)

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

  // --- Lógica del Modal ---
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

  const agregarAlCarrito = () => {
    if (!productoSeleccionado) return

    const existeIndex = carrito.findIndex(
      item => item.id === productoSeleccionado.id && item.masa === masa
    )

    if (existeIndex >= 0) {
      const nuevoCarrito = [...carrito]
      nuevoCarrito[existeIndex].cantidad += cantidad
      setCarrito(nuevoCarrito)
    } else {
      setCarrito([...carrito, { ...productoSeleccionado, cantidad, masa }])
    }
    cerrarModal()
  }

  // --- Lógica del Carrito ---
  const quitarDelCarrito = (index: number) => {
    const nuevoCarrito = [...carrito]
    nuevoCarrito.splice(index, 1)
    setCarrito(nuevoCarrito)
    if (nuevoCarrito.length === 0) setMostrarCarrito(false)
  }

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
  const itemsCarrito = carrito.reduce((acc, item) => acc + item.cantidad, 0)

  // --- Enviar Pedido a Supabase (CON EL NÚMERO DIARIO) ---
  const confirmarPedido = async () => {
    if (nombreCliente.trim() === '') {
      alert('Por favor, escribe tu nombre para preparar el pedido.')
      return
    }

    setEnviando(true)

    try {
      // 1. Calcular el número de pedido del día
      const hoy = new Date().toISOString().split('T')[0]
      
      const { count, error: countError } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_hora', `${hoy}T00:00:00.000Z`)

      if (countError) throw countError

      const numeroPedidoHoy = (count || 0) + 1

      // 2. Calcular tiempo estimado dinámico
      const { count: pedidosActivos } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .neq('estado', 'entregado')

      let tiempoCalculado = 30 + ((pedidosActivos || 0) * 10)
      if (tiempoCalculado > 60) tiempoCalculado = 60

      // 3. Insertar el pedido principal
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([{ 
          numero_pedido: numeroPedidoHoy,
          nombre_cliente: nombreCliente, 
          total: totalCarrito, 
          estado: 'tomado', 
          tiempo_estimado: tiempoCalculado 
        }])
        .select()
        .single()

      if (pedidoError) throw pedidoError

      // 4. Insertar el detalle del pedido
      const detallesParaInsertar = carrito.map(item => ({
        pedido_id: pedidoData.id,
        producto_id: item.id,
        cantidad: item.cantidad,
        masa: item.masa,
        precio_unitario: item.precio,
        subtotal: item.precio * item.cantidad
      }))

      const { error: detalleError } = await supabase
        .from('detalle_pedido')
        .insert(detallesParaInsertar)

      if (detalleError) throw detalleError

      // 5. Mostrar pantalla de éxito
            // 5. Mostrar pantalla de éxito guardando los datos del ticket
      setPedidoExitoso({ 
        numero: numeroPedidoHoy, 
        tiempo: tiempoCalculado,
        fecha: new Date().toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }),
        items: [...carrito], // Guardamos una copia del carrito
        total: totalCarrito
      })
      setCarrito([]) 
      setMostrarCarrito(false)

    } catch (error: any) {
      console.error(error)
      alert('Hubo un error al enviar el pedido: ' + error.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF3E8] p-4 pb-24 relative">
      <header className="bg-[#6B1B1B] text-white p-4 rounded-lg shadow-md mb-6 sticky top-4 z-10">
        <h1 className="text-2xl font-bold text-center">Dulce Herencia</h1>
      </header>
      
      {/* MENÚ DE PRODUCTOS */}
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

      {/* BARRA FLOTANTE DEL CARRITO */}
      {itemsCarrito > 0 && !mostrarCarrito && !pedidoExitoso && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#e8dac7] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-40 flex justify-center">
          <button 
            onClick={() => setMostrarCarrito(true)}
            className="w-full max-w-md bg-[#6B1B1B] text-white py-3 rounded-xl font-bold text-lg flex justify-between px-6 hover:bg-red-900 transition-colors"
          >
            <span>{itemsCarrito} items</span>
            <span>Ver carrito · ${totalCarrito.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* MODAL DEL PRODUCTO (Masa y cantidad) */}
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

      {/* PANTALLA DEL CARRITO (Revisión y Confirmación) */}
      {mostrarCarrito && (
        <div className="fixed inset-0 bg-[#FAF3E8] z-50 overflow-y-auto">
          <div className="max-w-md mx-auto p-4 pb-32">
            <div className="flex items-center mb-6 pt-4">
              <button onClick={() => setMostrarCarrito(false)} className="text-[#6B1B1B] text-3xl font-bold mr-4">←</button>
              <h2 className="text-2xl font-bold text-[#6B1B1B]">Tu Pedido</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#e8dac7] mb-6">
              {carrito.map((item, index) => (
                <div key={index} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{item.cantidad}x {item.nombre}</p>
                    {item.masa && <p className="text-sm text-gray-500 capitalize">Masa: {item.masa}</p>}
                    <p className="text-[#E67E22] font-semibold">${(item.precio * item.cantidad).toFixed(2)}</p>
                  </div>
                  <button onClick={() => quitarDelCarrito(index)} className="text-red-500 text-sm font-medium hover:underline">
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e8dac7] mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">¿A nombre de quién es el pedido?</label>
              <input 
                type="text" 
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Ej: María" 
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-[#6B1B1B] focus:ring-1 focus:ring-[#6B1B1B]"
              />
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#e8dac7] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 flex justify-center">
              <button 
                onClick={confirmarPedido}
                disabled={enviando}
                className="w-full max-w-md bg-[#6B1B1B] text-white py-3 rounded-xl font-bold text-lg flex justify-between px-6 hover:bg-red-900 transition-colors disabled:bg-gray-400"
              >
                <span>{enviando ? 'Enviando...' : 'Confirmar Pedido'}</span>
                <span>${totalCarrito.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

            {/* PANTALLA DE ÉXITO (EL TICKET) */}
      {pedidoExitoso && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 print:bg-white print:p-0 print:static">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
            
            {/* Cabecera del Ticket */}
            <div className="bg-[#6B1B1B] text-white p-6 text-center print:bg-white print:text-black print:border-b-2 print:border-dashed print:border-gray-400">
              <h2 className="text-2xl font-bold mb-1">Dulce Herencia</h2>
              <p className="text-sm opacity-90">¡Gracias por tu pedido!</p>
            </div>
            
            {/* Cuerpo del Ticket */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-1">NÚMERO DE ORDEN</p>
                <p className="text-5xl font-black text-[#E67E22] tracking-wider">#{pedidoExitoso.numero.toString().padStart(4, '0')}</p>
              </div>

              <div className="flex justify-between text-sm text-gray-600 mb-6 border-b border-dashed border-gray-300 pb-4">
                <span>📅 {pedidoExitoso.fecha}</span>
                <span>⏱️ ~ {pedidoExitoso.tiempo} min</span>
              </div>

              {/* Lista de productos */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Detalle de tu orden</p>
                <ul className="space-y-2">
                  {pedidoExitoso.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between text-sm">
                      <span>
                        <strong className="text-gray-800">{item.cantidad}x</strong> {item.nombre}
                        {item.masa && <span className="text-gray-500 text-xs ml-1 capitalize">({item.masa})</span>}
                      </span>
                      <span className="font-medium">${(item.precio * item.cantidad).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-4 mb-6">
                <span className="font-bold text-gray-600">TOTAL A PAGAR</span>
                <span className="text-2xl font-bold text-[#6B1B1B]">${pedidoExitoso.total.toFixed(2)}</span>
              </div>

              {/* Pie del ticket (Teléfono) */}
              <div className="text-center bg-gray-50 p-3 rounded-lg print:bg-white print:border print:border-gray-300">
                <p className="text-xs text-gray-500">¿Dudas con tu pedido? Llámanos:</p>
                <p className="font-bold text-[#6B1B1B] text-lg">7000-0000</p> {/* <-- CAMBIA ESTE NÚMERO AQUÍ */}
              </div>
            </div>

            {/* Botones (Ocultos al imprimir) */}
            <div className="p-4 bg-gray-100 flex gap-2 print:hidden">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-white border-2 border-[#6B1B1B] text-[#6B1B1B] py-2 rounded-xl font-bold hover:bg-gray-50"
              >
                🖨️ Guardar Ticket
              </button>
              <button 
                onClick={() => setPedidoExitoso(null)}
                className="flex-1 bg-[#6B1B1B] text-white py-2 rounded-xl font-bold hover:bg-red-900"
              >
                Volver al menú
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}