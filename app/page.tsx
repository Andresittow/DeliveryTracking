"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  Package, 
  Zap, 
  CheckCircle2,
  AlertTriangle,
  Bike
} from "lucide-react"

interface LogEntry {
  id: number
  message: string
  type: "success" | "error"
  timestamp: Date
}

interface Position {
  x: number
  y: number
}

// URL del WebSocket oficial de tu API Gateway
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "wss://dawdayljf4.execute-api.us-east-1.amazonaws.com/production"

export default function OperationsDashboard() {
  const [orderId, setOrderId] = useState("ORD-456")
  const [isConnected, setIsConnected] = useState(false)
  const [courierPosition, setCourierPosition] = useState<Position>({ x: 50, y: 300 })
  const [pathHistory, setPathHistory] = useState<Position[]>([{ x: 50, y: 300 }])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error429Count, setError429Count] = useState(0)
  const [isExecutingBurst, setIsExecutingBurst] = useState(false)
  const [orderInputId, setOrderInputId] = useState("")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const handleConnect = useCallback(() => {
    const currentOrderId = orderInputId.trim() || "ORD-456"
    setOrderId(currentOrderId)
    setConnectionError(null)
    setCourierPosition({ x: 50, y: 300 })
    setPathHistory([{ x: 50, y: 300 }])

    if (WEBSOCKET_URL) {
      try {
        if (wsRef.current) {
          wsRef.current.close()
        }

        const wsUrl = `${WEBSOCKET_URL}?orderId=${encodeURIComponent(currentOrderId)}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log("WebSocket conectado a:", wsUrl)
          setIsConnected(true)
          setConnectionError(null)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.lat !== undefined && data.lng !== undefined) {
              const newPos = { x: data.lng, y: data.lat }
              setCourierPosition(newPos)
              setPathHistory(prev => [...prev, newPos])
            }
          } catch (e) {
            console.log("Mensaje no-JSON recibido:", event.data)
          }
        }

        ws.onerror = (error) => {
          console.error("Error de WebSocket:", error)
          setConnectionError("Error de conexión al WebSocket")
          setIsConnected(false)
        }

        ws.onclose = (event) => {
          console.log("WebSocket cerrado:", event.code, event.reason)
          setIsConnected(false)
          if (event.code !== 1000) {
            setConnectionError(`Conexión cerrada: Error interno en AWS (Verificar logs de Lambda)`)
          }
        }

        wsRef.current = ws
      } catch (error) {
        setConnectionError("No se pudo instanciar el WebSocket")
      }
    }
  }, [orderInputId])

  const handleFinishDelivery = useCallback(() => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        action: "complete-delivery",
        orderId: orderId,
        courierId: "repartidor-01" 
      }))
      
      wsRef.current.close(1000, "Entrega finalizada por el operador")
      wsRef.current = null
    }
    setIsConnected(false)
    setPathHistory([])
    setCourierPosition({ x: 50, y: 300 })
    setConnectionError(null)
  }, [isConnected, orderId])

  const addLog = useCallback((message: string, type: "success" | "error") => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date()
    }
    setLogs(prev => [...prev.slice(-80), entry])
    if (type === "error" && message.includes("429")) {
      setError429Count(prev => prev + 1)
    }
  }, [])

  const executeBurst = useCallback(async () => {
    setIsExecutingBurst(true)
    setLogs([])
    setError429Count(0)

    // Aumentamos a 100 para saturar definitivamente el límite del navegador y de NGINX
    const totalRequests = 100; 
    
    // Usamos el origin actual automáticamente (tu IP dinámica de EC2)
    const serverUrl = window.location.origin;

    const promises = Array.from({ length: totalRequests }).map((_, i) => {
      return fetch(`${serverUrl}/?t=${Date.now()}_${i}`, { cache: 'no-store' })
        .then(response => {
          if (response.status === 429) {
            addLog(`[${new Date().toLocaleTimeString()}] Petición #${i + 1} - Bloqueado por NGINX (429 Too Many Requests)`, "error")
          } else {
            addLog(`[${new Date().toLocaleTimeString()}] Petición #${i + 1} enviada (${response.status} OK)`, "success")
          }
        })
        .catch(err => {
          addLog(`[${new Date().toLocaleTimeString()}] Petición #${i + 1} - Rechazada violentamente por el firewall`, "error")
        });
    });

    await Promise.allSettled(promises);
    setTimeout(() => setIsExecutingBurst(false), 1000)
  }, [addLog])

  return (
    <div className="min-h-screen p-6 bg-[#09090b]">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Panel de Monitoreo de Pedidos
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            Estado de la Conexión WebSocket
          </span>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isConnected 
              ? "bg-green-500/20 text-green-400" 
              : "bg-red-500/20 text-red-400"
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Conexión activa</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">No conectado</span>
                <span className="w-2 h-2 rounded-full bg-red-500" />
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-[#18181b]/50 backdrop-blur-xl border-gray-800 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5 text-blue-500" />
                Mapa de Seguimiento - Pedido {orderId}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[400px] bg-black/30 rounded-lg overflow-hidden border border-gray-800">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-800" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {pathHistory.length > 1 && (
                    <polyline
                      points={pathHistory.map(p => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="5,5"
                      className="text-blue-500/60"
                    />
                  )}
                  
                  {pathHistory.map((pos, index) => (
                    <circle key={index} cx={pos.x} cy={pos.y} r={index === pathHistory.length - 1 ? 0 : 3} className="fill-blue-500/40" />
                  ))}
                </svg>

                <div className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500" style={{ left: 50 - 16, top: 300 - 16 }}>
                  <Package className="w-4 h-4 text-green-500" />
                </div>

                <div className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border-2 border-blue-500" style={{ left: 550 - 16, top: 150 - 16 }}>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>

                {isConnected && (
                  <div className="absolute transition-all duration-1000 ease-out" style={{ left: courierPosition.x - 20, top: courierPosition.y - 20 }}>
                    <div className="relative">
                      <div className="absolute inset-0 w-10 h-10 rounded-full bg-blue-500/30 animate-ping" />
                      <div className="relative w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <Bike className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4 px-2 py-1 bg-black/80 backdrop-blur rounded text-xs text-gray-400">Origen</div>
                <div className="absolute top-[120px] right-4 px-2 py-1 bg-black/80 backdrop-blur rounded text-xs text-gray-400">Destino</div>

                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <p className="text-gray-400 text-lg">Conecte a una orden para ver el seguimiento</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[#18181b]/50 backdrop-blur-xl border-gray-800 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="w-5 h-5 text-blue-500" />
                Controles del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">ID del Pedido</label>
                <Input
                  placeholder="Ingresar ID del Pedido"
                  value={orderInputId}
                  onChange={(e) => setOrderInputId(e.target.value)}
                  className="bg-black border-gray-800 focus:border-blue-500 text-white"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Conectar a la Orden
                </Button>
                <Button
                  onClick={handleFinishDelivery}
                  disabled={!isConnected}
                  variant="outline"
                  className="w-full border-gray-800 hover:bg-gray-800 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalizar Entrega (Activar Transacción)
                </Button>
              </div>
              {isConnected && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Seguimiento activo: {orderId}
                  </p>
                </div>
              )}
              {connectionError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {connectionError}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {isConnected && (
            <Card className="bg-[#18181b]/50 backdrop-blur-xl border-gray-800 shadow-2xl">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-black">
                    <p className="text-xs text-gray-400">Longitud (X)</p>
                    <p className="text-lg font-mono text-white">{Math.round(courierPosition.x)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black">
                    <p className="text-xs text-gray-400">Latitud (Y)</p>
                    <p className="text-lg font-mono text-white">{Math.round(courierPosition.y)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          <Card className="bg-[#18181b]/50 backdrop-blur-xl border-gray-800 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-yellow-500" />
                Prueba de Estrés y Validación Cloud (NGINX Rate Limit)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Esta herramienta dispara peticiones HTTP reales a tu instancia EC2. NGINX está configurado para permitir 10 peticiones por segundo. Observa cómo rechaza el exceso de tráfico.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  onClick={executeBurst}
                  disabled={isExecutingBurst}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-base shadow-lg shadow-red-500/30"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {isExecutingBurst ? "Disparando peticiones..." : "Ejecutar Ráfaga de Peticiones HTTP"}
                </Button>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black border border-gray-800">
                  <span className="text-sm text-gray-400">
                    Errores 429 Totales:
                  </span>
                  <span className="text-xl font-bold font-mono text-red-500">
                    {error429Count}
                  </span>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-gray-800">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#27272a] border-b border-gray-800">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-xs text-gray-400 font-mono">
                    terminal - registro de peticiones
                  </span>
                </div>
                <div className="bg-black p-4 h-[200px] overflow-y-auto font-mono text-sm">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 italic">
                      Esperando ejecución de prueba de estrés...
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={`mb-1 ${
                          log.type === "success" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {log.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}