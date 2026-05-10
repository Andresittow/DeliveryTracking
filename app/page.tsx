"use client"

import { useState, useCallback, useEffect } from "react"
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

export default function OperationsDashboard() {
  const [orderId, setOrderId] = useState("ORD-456")
  const [isConnected, setIsConnected] = useState(false)
  const [courierPosition, setCourierPosition] = useState<Position>({ x: 50, y: 300 })
  const [pathHistory, setPathHistory] = useState<Position[]>([{ x: 50, y: 300 }])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error429Count, setError429Count] = useState(0)
  const [isExecutingBurst, setIsExecutingBurst] = useState(false)
  const [orderInputId, setOrderInputId] = useState("")

  // Simulate courier movement when connected
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      setCourierPosition(prev => {
        const newX = Math.min(prev.x + Math.random() * 30, 550)
        const newY = prev.y + (Math.random() - 0.5) * 40
        const clampedY = Math.max(50, Math.min(350, newY))
        const newPos = { x: newX, y: clampedY }
        setPathHistory(history => [...history, newPos])
        return newPos
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [isConnected])

  const handleConnect = useCallback(() => {
    if (orderInputId.trim()) {
      setOrderId(orderInputId)
    }
    setIsConnected(true)
    setCourierPosition({ x: 50, y: 300 })
    setPathHistory([{ x: 50, y: 300 }])
  }, [orderInputId])

  const handleFinishDelivery = useCallback(() => {
    setIsConnected(false)
    setPathHistory([])
    setCourierPosition({ x: 50, y: 300 })
  }, [])

  const addLog = useCallback((message: string, type: "success" | "error") => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date()
    }
    setLogs(prev => [...prev.slice(-50), entry])
    if (type === "error") {
      setError429Count(prev => prev + 1)
    }
  }, [])

  const executeBurst = useCallback(async () => {
    setIsExecutingBurst(true)
    setLogs([])
    setError429Count(0)

    // Simulate 30 rapid requests - first 20 succeed (burst limit), then rate limited
    const totalRequests = 30
    let successCount = 0
    const burstLimit = 20 // 10 req/s + burst of 20

    for (let i = 0; i < totalRequests; i++) {
      await new Promise(resolve => setTimeout(resolve, 80))
      
      if (successCount < burstLimit && Math.random() > 0.1) {
        addLog(`[${new Date().toLocaleTimeString()}] Petición #${i + 1} enviada (200 OK)`, "success")
        successCount++
      } else {
        addLog(`[${new Date().toLocaleTimeString()}] Petición #${i + 1} - Bloqueado por Rate Limit (429 Too Many Requests)`, "error")
      }
    }

    setIsExecutingBurst(false)
  }, [addLog])

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Panel de Monitoreo de Pedidos
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Estado de la Conexión WebSocket
          </span>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isConnected 
              ? "bg-success/20 text-success" 
              : "bg-destructive/20 text-destructive"
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Conexión activa</span>
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">No conectado</span>
                <span className="w-2 h-2 rounded-full bg-destructive" />
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Map View */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                Mapa de Seguimiento - Pedido {orderId}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[400px] bg-secondary/30 rounded-lg overflow-hidden border border-border/30">
                {/* Grid pattern */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path 
                        d="M 40 0 L 0 0 0 40" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="0.5"
                        className="text-border/40"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Path trace */}
                  {pathHistory.length > 1 && (
                    <polyline
                      points={pathHistory.map(p => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="5,5"
                      className="text-primary/60"
                    />
                  )}
                  
                  {/* Path dots */}
                  {pathHistory.map((pos, index) => (
                    <circle
                      key={index}
                      cx={pos.x}
                      cy={pos.y}
                      r={index === pathHistory.length - 1 ? 0 : 3}
                      className="fill-primary/40"
                    />
                  ))}
                </svg>

                {/* Start marker */}
                <div 
                  className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-success/20 border-2 border-success"
                  style={{ left: 50 - 16, top: 300 - 16 }}
                >
                  <Package className="w-4 h-4 text-success" />
                </div>

                {/* Destination marker */}
                <div 
                  className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 border-2 border-primary"
                  style={{ left: 550 - 16, top: 150 - 16 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>

                {/* Courier icon */}
                {isConnected && (
                  <div 
                    className="absolute transition-all duration-1000 ease-out"
                    style={{ 
                      left: courierPosition.x - 20, 
                      top: courierPosition.y - 20 
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/30 animate-ping" />
                      <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50">
                        <Bike className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Labels */}
                <div className="absolute top-4 left-4 px-2 py-1 bg-background/80 backdrop-blur rounded text-xs text-muted-foreground">
                  Origen
                </div>
                <div className="absolute top-[120px] right-4 px-2 py-1 bg-background/80 backdrop-blur rounded text-xs text-muted-foreground">
                  Destino
                </div>

                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <p className="text-muted-foreground text-lg">
                      Conecte a una orden para ver el seguimiento
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Order Controls */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Package className="w-5 h-5 text-primary" />
                Controles del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">ID del Pedido</label>
                <Input
                  placeholder="Ingresar ID del Pedido"
                  value={orderInputId}
                  onChange={(e) => setOrderInputId(e.target.value)}
                  className="bg-input border-border/50 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={isConnected}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Conectar a la Orden
                </Button>
                <Button
                  onClick={handleFinishDelivery}
                  disabled={!isConnected}
                  variant="outline"
                  className="w-full border-border/50 hover:bg-secondary"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalizar Entrega
                </Button>
              </div>
              {isConnected && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                  <p className="text-sm text-success flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    Seguimiento activo: {orderId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Position Info */}
          {isConnected && (
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-2xl">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Posición X</p>
                    <p className="text-lg font-mono text-foreground">{Math.round(courierPosition.x)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Posición Y</p>
                    <p className="text-lg font-mono text-foreground">{Math.round(courierPosition.y)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cloud Testing Panel - Full Width */}
        <div className="lg:col-span-3">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-warning" />
                Prueba de Estrés y Validación Cloud
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta herramienta valida el comportamiento del rate-limiting de NGINX configurado 
                a 10 peticiones por segundo con una ráfaga máxima de 20 peticiones. 
                Al ejecutar la prueba, se simularán múltiples peticiones rápidas para 
                demostrar cómo el servidor responde cuando se excede el límite.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  onClick={executeBurst}
                  disabled={isExecutingBurst}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-6 py-3 text-base shadow-lg shadow-destructive/30"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {isExecutingBurst ? "Ejecutando..." : "Ejecutar Ráfaga de Peticiones (Simulación 429)"}
                </Button>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50">
                  <span className="text-sm text-muted-foreground">
                    Total de errores 429 detectados:
                  </span>
                  <span className="text-xl font-bold font-mono text-destructive">
                    {error429Count}
                  </span>
                </div>
              </div>

              {/* Log Terminal */}
              <div className="rounded-lg overflow-hidden border border-border/50">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/80 border-b border-border/50">
                  <div className="w-3 h-3 rounded-full bg-destructive/80" />
                  <div className="w-3 h-3 rounded-full bg-warning/80" />
                  <div className="w-3 h-3 rounded-full bg-success/80" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    terminal - registro de peticiones
                  </span>
                </div>
                <div className="bg-[#0a0a0a] p-4 h-[200px] overflow-y-auto font-mono text-sm">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground/50 italic">
                      Esperando ejecución de prueba de estrés...
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={`mb-1 ${
                          log.type === "success" ? "text-success" : "text-destructive"
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
