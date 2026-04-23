import { NextRequest, NextResponse } from "next/server";

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}

// GET /api/telemetry?topic=xxx
// Simula la obtención del último valor retenido en un tópico MQTT
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic");
  if (!topic) return NextResponse.json({ ok: false, error: "topic required" }, { status: 400 });

  // Simulación de valores realistas basados en el tópico
  // Si el tópico contiene 'p1', 'p2', etc., generamos consumos
  const seed = topic.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => (Math.random() * (max - min) + min).toFixed(2);

  // Valor determinístico + pequeña variación aleatoria
  const voltage = 230 + (seed % 5) + Math.random();
  const current = (seed % 10) + Math.random();
  const power = voltage * current;

  return ok({
    topic,
    timestamp: new Date().toISOString(),
    values: {
      voltage: parseFloat(voltage.toFixed(2)),
      current: parseFloat(current.toFixed(2)),
      power: parseFloat(power.toFixed(2)),
      unitV: "V",
      unitA: "A",
      unitW: "W"
    }
  });
}
